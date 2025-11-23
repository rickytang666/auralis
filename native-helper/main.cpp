/**
 * SmartSpectra WebSocket Helper
 * Captures vitals via SmartSpectra SDK and broadcasts to web clients
 * Minimal implementation for hackathon speed
 */

#include <smartspectra/container/foreground_container.hpp>
#include <smartspectra/container/settings.hpp>
#include <smartspectra/video_source/camera/camera.hpp>
#include <glog/logging.h>
#include <google/protobuf/util/json_util.h>
#include <opencv2/opencv.hpp>

#include <websocketpp/config/asio_no_tls.hpp>
#include <websocketpp/server.hpp>
#include <set>
#include <mutex>
#include <thread>

namespace spectra = presage::smartspectra;
namespace settings = presage::smartspectra::container::settings;
namespace vs = presage::smartspectra::video_source;

typedef websocketpp::server<websocketpp::config::asio> server;
using websocketpp::connection_hdl;

class SmartSpectraWebSocketServer {
public:
    SmartSpectraWebSocketServer() {
        // WebSocket server setup
        ws_server_.init_asio();
        ws_server_.set_reuse_addr(true);
        
        ws_server_.set_open_handler([this](connection_hdl hdl) {
            std::lock_guard<std::mutex> lock(connections_mutex_);
            connections_.insert(hdl);
            LOG(INFO) << "Client connected. Total clients: " << connections_.size();
        });
        
        ws_server_.set_close_handler([this](connection_hdl hdl) {
            std::lock_guard<std::mutex> lock(connections_mutex_);
            connections_.erase(hdl);
            LOG(INFO) << "Client disconnected. Total clients: " << connections_.size();
        });
    }
    
    void Start(const std::string& api_key, int camera_index = 0, const std::string& input_video_path = "") {
        // Configure SmartSpectra for continuous monitoring using explicit field initialization
        settings::Settings<settings::OperationMode::Continuous, settings::IntegrationMode::Rest> config{};

        // Video source configuration
        config.video_source.device_index = camera_index;
        config.video_source.resolution_selection_mode = vs::ResolutionSelectionMode::Auto;
        config.video_source.capture_width_px = 1280;
        config.video_source.capture_height_px = 720;
        config.video_source.resolution_range = presage::camera::CameraResolutionRange::Unspecified_EnumEnd;
        config.video_source.codec = presage::camera::CaptureCodec::MJPG;
        config.video_source.auto_lock = true;
        config.video_source.input_transform_mode = vs::InputTransformMode::None;

        // If an input video path is provided, use it instead of camera device
        if (!input_video_path.empty()) {
            config.video_source.input_video_path = input_video_path;
        }

        // General settings
        config.headless = true; // no OpenCV GUI in container
        config.interframe_delay_ms = 20;
        config.enable_edge_metrics = true; // enable edge metrics for real-time data

        // Continuous-specific settings
        config.continuous.preprocessed_data_buffer_duration_s = 0.5;

        // Integration (REST) settings - set API key
        config.rest().api_key = api_key;

        container_ = std::make_unique<spectra::container::CpuContinuousRestForegroundContainer>(config);
        
        // Set up metrics callback
        auto status = container_->SetOnCoreMetricsOutput(
            [this](const presage::physiology::MetricsBuffer& metrics, int64_t timestamp) {
                return HandleMetrics(metrics, timestamp);
            });
        
        if (!status.ok()) {
            LOG(ERROR) << "Failed to set metrics callback: " << status.message();
            return;
        }
        
        // Set up edge metrics callback for real-time updates
        status = container_->SetOnEdgeMetricsOutput(
            [this](const presage::physiology::Metrics& metrics, int64_t input_timestamp) {
                return HandleEdgeMetrics(metrics, input_timestamp);
            });
        
        if (!status.ok()) {
            LOG(ERROR) << "Failed to set edge metrics callback: " << status.message();
            return;
        }
        
        // Initialize container
        status = container_->Initialize();
        if (!status.ok()) {
            LOG(ERROR) << "Failed to initialize SmartSpectra: " << status.message();
            return;
        }
        
        LOG(INFO) << "SmartSpectra initialized. Starting WebSocket server on port 8765...";
        
        // Start WebSocket server in background thread
        ws_thread_ = std::thread([this]() {
            ws_server_.listen(8765);
            ws_server_.start_accept();
            ws_server_.run();
        });
        
        // Run SmartSpectra processing (blocking)
        LOG(INFO) << "Starting SmartSpectra processing...";
        status = container_->Run();
        
        if (!status.ok()) {
            LOG(ERROR) << "SmartSpectra run failed: " << status.message();
        }
    }
    
    void Stop() {
        ws_server_.stop();
        if (ws_thread_.joinable()) {
            ws_thread_.join();
        }
    }
    
private:
    absl::Status HandleMetrics(const presage::physiology::MetricsBuffer& metrics, int64_t timestamp) {
        // Extract vital signs
        int pulse_rate = static_cast<int>(metrics.pulse().strict().value());
        int breathing_rate = static_cast<int>(metrics.breathing().strict().value());
        
        float pulse_confidence = 0.0f;
        if (metrics.pulse().rate_size() > 0) {
            pulse_confidence = metrics.pulse().rate(metrics.pulse().rate_size() - 1).confidence();
        }
        
        float breathing_confidence = 0.0f;
        if (metrics.breathing().rate_size() > 0) {
            breathing_confidence = metrics.breathing().rate(metrics.breathing().rate_size() - 1).confidence();
        }
        
        // Create JSON message
        std::string json_msg = "{"
            "\"type\":\"vitals\","
            "\"timestamp\":" + std::to_string(timestamp) + ","
            "\"pulse\":" + std::to_string(pulse_rate) + ","
            "\"pulseConfidence\":" + std::to_string(pulse_confidence) + ","
            "\"breathing\":" + std::to_string(breathing_rate) + ","
            "\"breathingConfidence\":" + std::to_string(breathing_confidence) +
            "}";
        
        Broadcast(json_msg);
        
        LOG(INFO) << "Vitals - Pulse: " << pulse_rate << " BPM, Breathing: " << breathing_rate << " BPM";
        
        return absl::OkStatus();
    }
    
    absl::Status HandleEdgeMetrics(const presage::physiology::Metrics& metrics, int64_t input_timestamp) {
        // Send real-time breathing trace for animation
        const auto& upper_trace = metrics.breathing().upper_trace();
        if (!upper_trace.empty()) {
            float latest_value = upper_trace.rbegin()->value();
            
            std::string json_msg = "{"
                "\"type\":\"breathing_trace\","
                "\"value\":" + std::to_string(latest_value) +
                "}";
            
            Broadcast(json_msg);
        }
        
        return absl::OkStatus();
    }
    
    void Broadcast(const std::string& message) {
        std::lock_guard<std::mutex> lock(connections_mutex_);
        for (auto hdl : connections_) {
            try {
                ws_server_.send(hdl, message, websocketpp::frame::opcode::text);
            } catch (const std::exception& e) {
                LOG(WARNING) << "Failed to send to client: " << e.what();
            }
        }
    }
    
    server ws_server_;
    std::thread ws_thread_;
    std::set<connection_hdl, std::owner_less<connection_hdl>> connections_;
    std::mutex connections_mutex_;
    std::unique_ptr<spectra::container::CpuContinuousRestForegroundContainer> container_;
};

int main(int argc, char** argv) {
    google::InitGoogleLogging(argv[0]);
    FLAGS_alsologtostderr = true;
    
    // Check for API key
    if (argc < 2) {
        LOG(ERROR) << "Usage: " << argv[0] << " <API_KEY> [camera_index]";
        LOG(ERROR) << "Get API key from: https://physiology.presagetech.com";
        return EXIT_FAILURE;
    }
    
    std::string api_key = argv[1];
    int camera_index = 0;
    std::string input_video_path;
    if (argc >= 3) {
        camera_index = std::atoi(argv[2]);
    }
    if (argc >= 4) {
        input_video_path = argv[3];
    }
    
    LOG(INFO) << "SmartSpectra WebSocket Helper starting...";
    LOG(INFO) << "Camera index: " << camera_index;
    LOG(INFO) << "WebSocket will be available at: ws://localhost:8765";
    
    SmartSpectraWebSocketServer server;
    server.Start(api_key, camera_index, input_video_path);

    // If an input video path was provided, set it on the container config via env or arg handling inside Start
    // (Start already reads the camera index; the helper reads argv[3] as optional input video when building settings.)
    
    LOG(INFO) << "Shutting down...";
    server.Stop();
    
    return EXIT_SUCCESS;
}
