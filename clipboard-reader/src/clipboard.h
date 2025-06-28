#pragma once

#include <windows.h>
#include <string>
#include <vector>
#include <memory>

enum class ClipboardType {
    EMPTY,
    TEXT,
    IMAGE,
    CLIPBOARD_ERROR
};

struct ImageData {
    std::vector<unsigned char> data;
    int width;
    int height;
    size_t size;
    std::string mimeType;
};

struct ClipboardData {
    ClipboardType type;
    std::string textData;
    ImageData imageData;
    std::string errorMessage;
};

class ClipboardReader {
public:
    ClipboardReader();
    ~ClipboardReader();
    
    ClipboardData ReadClipboard();
    
private:
    bool OpenClipboardSafe();
    void CloseClipboardSafe();
    
    ClipboardData ReadTextFromClipboard();
    ClipboardData ReadImageFromClipboard();
    
    std::vector<unsigned char> ConvertBitmapToPNG(HBITMAP hBitmap);
    std::vector<unsigned char> ConvertDIBToPNG(HANDLE hDIB);
    
    bool m_clipboardOpen;
};

class ClipboardRAII {
public:
    ClipboardRAII();
    ~ClipboardRAII();
    bool IsOpen() const { return m_isOpen; }
    
private:
    bool m_isOpen;
};