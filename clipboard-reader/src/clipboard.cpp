#include "clipboard.h"
#include <iostream>
#include <sstream>
#include <gdiplus.h>
#include <comdef.h>

#pragma comment(lib, "gdiplus.lib")

using namespace Gdiplus;

ClipboardRAII::ClipboardRAII() : m_isOpen(false) {
    if (OpenClipboard(NULL)) {
        m_isOpen = true;
    }
}

ClipboardRAII::~ClipboardRAII() {
    if (m_isOpen) {
        CloseClipboard();
    }
}

ClipboardReader::ClipboardReader() : m_clipboardOpen(false) {
    GdiplusStartupInput gdiplusStartupInput;
    ULONG_PTR gdiplusToken;
    GdiplusStartup(&gdiplusToken, &gdiplusStartupInput, NULL);
}

ClipboardReader::~ClipboardReader() {
    if (m_clipboardOpen) {
        CloseClipboardSafe();
    }
}

bool ClipboardReader::OpenClipboardSafe() {
    if (!m_clipboardOpen) {
        m_clipboardOpen = OpenClipboard(NULL) != FALSE;
    }
    return m_clipboardOpen;
}

void ClipboardReader::CloseClipboardSafe() {
    if (m_clipboardOpen) {
        CloseClipboard();
        m_clipboardOpen = false;
    }
}

ClipboardData ClipboardReader::ReadClipboard() {
    ClipboardRAII clipboardGuard;
    if (!clipboardGuard.IsOpen()) {
        ClipboardData data;
        data.type = ClipboardType::CLIPBOARD_ERROR;
        data.errorMessage = "Failed to open clipboard";
        return data;
    }

    if (IsClipboardFormatAvailable(CF_BITMAP) || IsClipboardFormatAvailable(CF_DIB)) {
        auto imageData = ReadImageFromClipboard();
        if (imageData.type != ClipboardType::CLIPBOARD_ERROR) {
            return imageData;
        }
    }

    if (IsClipboardFormatAvailable(CF_UNICODETEXT) || IsClipboardFormatAvailable(CF_TEXT)) {
        return ReadTextFromClipboard();
    }

    ClipboardData data;
    data.type = ClipboardType::EMPTY;
    return data;
}

ClipboardData ClipboardReader::ReadTextFromClipboard() {
    ClipboardData data;
    data.type = ClipboardType::CLIPBOARD_ERROR;

    HANDLE hData = GetClipboardData(CF_UNICODETEXT);
    if (hData == NULL) {
        hData = GetClipboardData(CF_TEXT);
        if (hData == NULL) {
            data.errorMessage = "No text data available";
            return data;
        }
    }

    wchar_t* pszText = static_cast<wchar_t*>(GlobalLock(hData));
    if (pszText == NULL) {
        data.errorMessage = "Failed to lock clipboard text data";
        return data;
    }

    int size = WideCharToMultiByte(CP_UTF8, 0, pszText, -1, NULL, 0, NULL, NULL);
    if (size == 0) {
        GlobalUnlock(hData);
        data.errorMessage = "Failed to convert text to UTF-8";
        return data;
    }

    std::string utf8Text(size - 1, '\0');
    WideCharToMultiByte(CP_UTF8, 0, pszText, -1, &utf8Text[0], size, NULL, NULL);

    GlobalUnlock(hData);

    data.type = ClipboardType::TEXT;
    data.textData = utf8Text;
    return data;
}

ClipboardData ClipboardReader::ReadImageFromClipboard() {
    ClipboardData data;
    data.type = ClipboardType::CLIPBOARD_ERROR;

    HANDLE hData = GetClipboardData(CF_DIB);
    if (hData != NULL) {
        auto pngData = ConvertDIBToPNG(hData);
        if (!pngData.empty()) {
            data.type = ClipboardType::IMAGE;
            data.imageData.data = pngData;
            data.imageData.mimeType = "image/png";
            data.imageData.size = pngData.size();
            return data;
        }
    }

    hData = GetClipboardData(CF_BITMAP);
    if (hData != NULL) {
        auto pngData = ConvertBitmapToPNG(static_cast<HBITMAP>(hData));
        if (!pngData.empty()) {
            data.type = ClipboardType::IMAGE;
            data.imageData.data = pngData;
            data.imageData.mimeType = "image/png";
            data.imageData.size = pngData.size();
            return data;
        }
    }

    data.errorMessage = "Failed to read image from clipboard";
    return data;
}

std::vector<unsigned char> ClipboardReader::ConvertBitmapToPNG(HBITMAP hBitmap) {
    std::vector<unsigned char> result;
    
    try {
        Bitmap* bitmap = Bitmap::FromHBITMAP(hBitmap, NULL);
        if (bitmap == NULL) {
            return result;
        }

        IStream* stream = NULL;
        CreateStreamOnHGlobal(NULL, TRUE, &stream);
        if (stream == NULL) {
            delete bitmap;
            return result;
        }

        CLSID pngClsid;
        CLSIDFromString(L"{557CF406-1A04-11D3-9A73-0000F81EF32E}", &pngClsid);
        
        Status status = bitmap->Save(stream, &pngClsid, NULL);
        if (status != Ok) {
            stream->Release();
            delete bitmap;
            return result;
        }

        HGLOBAL hGlobal;
        GetHGlobalFromStream(stream, &hGlobal);
        SIZE_T size = GlobalSize(hGlobal);
        LPVOID pData = GlobalLock(hGlobal);
        
        if (pData != NULL) {
            result.resize(size);
            memcpy(result.data(), pData, size);
            GlobalUnlock(hGlobal);
        }

        stream->Release();
        delete bitmap;
    }
    catch (...) {
        result.clear();
    }

    return result;
}

std::vector<unsigned char> ClipboardReader::ConvertDIBToPNG(HANDLE hDIB) {
    std::vector<unsigned char> result;
    
    try {
        LPVOID pDIB = GlobalLock(hDIB);
        if (pDIB == NULL) {
            return result;
        }

        BITMAPINFOHEADER* pBIH = static_cast<BITMAPINFOHEADER*>(pDIB);
        
        HDC hdc = GetDC(NULL);
        HBITMAP hBitmap = CreateDIBitmap(hdc, pBIH, CBM_INIT, 
            static_cast<BYTE*>(pDIB) + pBIH->biSize + pBIH->biClrUsed * sizeof(RGBQUAD),
            reinterpret_cast<BITMAPINFO*>(pBIH), DIB_RGB_COLORS);
        
        ReleaseDC(NULL, hdc);
        GlobalUnlock(hDIB);

        if (hBitmap != NULL) {
            result = ConvertBitmapToPNG(hBitmap);
            DeleteObject(hBitmap);
        }
    }
    catch (...) {
        result.clear();
    }

    return result;
}