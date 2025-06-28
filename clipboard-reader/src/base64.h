#pragma once

#include <string>
#include <vector>

class Base64 {
public:
    static std::string Encode(const std::vector<unsigned char>& data);
    static std::string Encode(const unsigned char* data, size_t length);
    static std::vector<unsigned char> Decode(const std::string& encoded);
    
private:
    static const std::string chars;
    static bool IsBase64(unsigned char c);
};