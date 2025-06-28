CXX = x86_64-w64-mingw32-g++
CXXFLAGS = -std=c++17 -Os -Wall -Wextra -static -s -ffunction-sections -fdata-sections
INCLUDES = -I./src
LIBS = -lole32 -lgdi32 -lgdiplus -luser32 -lstdc++ -Wl,--gc-sections
TARGET = clipreader.exe
SRCDIR = src
SOURCES = $(SRCDIR)/main.cpp $(SRCDIR)/clipboard.cpp $(SRCDIR)/base64.cpp
OBJECTS = $(SOURCES:.cpp=.o)

.PHONY: all clean debug release

all: release

release: CXXFLAGS += -DNDEBUG
release: $(TARGET)

debug: CXXFLAGS += -g -DDEBUG
debug: $(TARGET)

$(TARGET): $(OBJECTS)
	$(CXX) $(CXXFLAGS) -o $@ $^ $(LIBS)

%.o: %.cpp
	$(CXX) $(CXXFLAGS) $(INCLUDES) -c $< -o $@

clean:
	rm -f $(OBJECTS) $(TARGET) *.exe *.o

test: $(TARGET)
	@echo "Testing clipboard reader..."
	@echo '{"jsonrpc":"2.0","method":"read_clipboard","id":1}' | ./$(TARGET)

install: $(TARGET)
	cp $(TARGET) /usr/local/bin/

.SUFFIXES: .cpp .o