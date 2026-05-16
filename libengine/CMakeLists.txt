cmake_minimum_required(VERSION 3.25)
# ↑ 要求 CMake 版本至少 3.25，VS 2026 内置的 CMake 满足此要求

project(libengine CXX)
# ↑ 项目名叫 libengine，语言是 CXX（即 C++）

set(CMAKE_CXX_STANDARD 20)
# ↑ 使用 C++20 标准（std::span 等特性需要此版本）

set(CMAKE_CXX_STANDARD_REQUIRED ON)
# ↑ 如果编译器不支持 C++20，直接报错，而不是悄悄降级

# -------------------------------------------------------
# L0 Core：纯头文件库（不需要编译，只需要告诉编译器头文件在哪）
# -------------------------------------------------------
add_library(engine_core INTERFACE)
# ↑ INTERFACE 表示这个库没有 .cpp 文件，只有头文件

target_include_directories(engine_core INTERFACE include)
# ↑ 告诉编译器：引用 engine_core 的代码，去 include/ 目录找头文件
#   这样代码里就能写 #include "engine/core/math.h"

# -------------------------------------------------------
# Google Test：用于单元测试
# FetchContent 会在第一次 CMake 配置时自动从网络下载
# -------------------------------------------------------
include(FetchContent)

FetchContent_Declare(
  googletest
  URL https://github.com/google/googletest/archive/refs/tags/v1.14.0.zip
)

# 防止 Google Test 覆盖我们自己的编译器设置（Windows 上必须加这两行）
set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)

FetchContent_MakeAvailable(googletest)
# ↑ 下载并配置 Google Test，让后面的 target_link_libraries 能用 GTest::gtest_main

# -------------------------------------------------------
# 测试子目录
# -------------------------------------------------------
enable_testing()
# ↑ 启用 CTest（CMake 的测试运行器）

add_subdirectory(tests)
# ↑ 告诉 CMake 还有一个 tests/ 子目录，去那里找 CMakeLists.txt
