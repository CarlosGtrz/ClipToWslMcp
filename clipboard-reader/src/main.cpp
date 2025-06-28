#include <windows.h>
#include <iostream>
#include <string>
#include <sstream>
#include <fstream>
#include "clipboard.h"
#include "base64.h"

class SimpleJSON {
public:
    static std::string EscapeString(const std::string& str) {
        std::string escaped;
        for (char c : str) {
            switch (c) {
                case '"': escaped += "\\\""; break;
                case '\\': escaped += "\\\\"; break;
                case '\b': escaped += "\\b"; break;
                case '\f': escaped += "\\f"; break;
                case '\n': escaped += "\\n"; break;
                case '\r': escaped += "\\r"; break;
                case '\t': escaped += "\\t"; break;
                default: escaped += c; break;
            }
        }
        return escaped;
    }

    static std::string CreateTextResponse(const std::string& text, int id = 1) {
        std::ostringstream json;
        json << "{"
             << "\"jsonrpc\":\"2.0\","
             << "\"result\":{"
             << "\"type\":\"text\","
             << "\"data\":\"" << EscapeString(text) << "\","
             << "\"encoding\":\"utf-8\","
             << "\"size\":" << text.size()
             << "},"
             << "\"id\":" << id
             << "}";
        return json.str();
    }

    static std::string CreateImageResponse(const std::string& base64Data, 
                                         const ImageData& imageData, int id = 1) {
        std::ostringstream json;
        json << "{"
             << "\"jsonrpc\":\"2.0\","
             << "\"result\":{"
             << "\"type\":\"image\","
             << "\"data\":\"" << base64Data << "\","
             << "\"mimeType\":\"" << imageData.mimeType << "\","
             << "\"width\":" << imageData.width << ","
             << "\"height\":" << imageData.height << ","
             << "\"size\":" << imageData.size
             << "},"
             << "\"id\":" << id
             << "}";
        return json.str();
    }

    static std::string CreateErrorResponse(const std::string& message, int code = -32603, int id = 1) {
        std::ostringstream json;
        json << "{"
             << "\"jsonrpc\":\"2.0\","
             << "\"error\":{"
             << "\"code\":" << code << ","
             << "\"message\":\"" << EscapeString(message) << "\""
             << "},"
             << "\"id\":" << id
             << "}";
        return json.str();
    }

    static std::string CreateEmptyResponse(int id = 1) {
        std::ostringstream json;
        json << "{"
             << "\"jsonrpc\":\"2.0\","
             << "\"result\":{"
             << "\"type\":\"empty\","
             << "\"message\":\"Clipboard is empty\""
             << "},"
             << "\"id\":" << id
             << "}";
        return json.str();
    }

    static int ExtractId(const std::string& request) {
        size_t idPos = request.find("\"id\":");
        if (idPos == std::string::npos) {
            return 1;
        }
        
        size_t start = idPos + 5;
        while (start < request.length() && (request[start] == ' ' || request[start] == '\t')) {
            start++;
        }
        
        size_t end = start;
        while (end < request.length() && std::isdigit(request[end])) {
            end++;
        }
        
        if (end > start) {
            return std::stoi(request.substr(start, end - start));
        }
        
        return 1;
    }

    static bool IsReadClipboardRequest(const std::string& request) {
        return request.find("\"method\":\"read_clipboard\"") != std::string::npos ||
               request.find("read_clipboard") != std::string::npos;
    }
};

void ProcessRequest(const std::string& line, ClipboardReader& reader) {
    try {
        if (line.empty() || line == "\n" || line == "\r\n") {
            return;
        }

        int requestId = SimpleJSON::ExtractId(line);

        if (!SimpleJSON::IsReadClipboardRequest(line)) {
            std::cout << SimpleJSON::CreateErrorResponse("Unknown method", -32601, requestId) << std::endl;
            std::cout.flush();
            return;
        }

        ClipboardData data = reader.ReadClipboard();

        switch (data.type) {
            case ClipboardType::TEXT: {
                std::cout << SimpleJSON::CreateTextResponse(data.textData, requestId) << std::endl;
                break;
            }
            case ClipboardType::IMAGE: {
                std::string base64 = Base64::Encode(data.imageData.data);
                std::cout << SimpleJSON::CreateImageResponse(base64, data.imageData, requestId) << std::endl;
                break;
            }
            case ClipboardType::EMPTY: {
                std::cout << SimpleJSON::CreateEmptyResponse(requestId) << std::endl;
                break;
            }
            case ClipboardType::CLIPBOARD_ERROR: {
                std::cout << SimpleJSON::CreateErrorResponse(data.errorMessage, -32603, requestId) << std::endl;
                break;
            }
        }
        
        std::cout.flush();
    }
    catch (const std::exception& e) {
        int requestId = SimpleJSON::ExtractId(line);
        std::cout << SimpleJSON::CreateErrorResponse(e.what(), -32603, requestId) << std::endl;
        std::cout.flush();
    }
}

int main() {
    try {
        ClipboardReader reader;
        std::string line;

        while (std::getline(std::cin, line)) {
            ProcessRequest(line, reader);
        }
    }
    catch (const std::exception& e) {
        std::cout << SimpleJSON::CreateErrorResponse(e.what()) << std::endl;
        std::cout.flush();
        return 1;
    }

    return 0;
}