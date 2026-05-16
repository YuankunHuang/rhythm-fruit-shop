add_executable(engine_tests
  # ↑ 创建一个可执行文件叫 engine_tests，后面列出它包含的源文件
  test_math.cpp
  # 后续每新增一个测试文件，在这里加一行
  test_timeline.cpp)

target_link_libraries(engine_tests
  PRIVATE
    engine_core      # 我们自己的 L0 Core 头文件库
    GTest::gtest_main  # Google Test 主函数（自动提供 main()，不需要自己写）
)

include(GoogleTest)
gtest_discover_tests(engine_tests)
# ↑ 让 CTest 自动发现 engine_tests 里所有以 TEST() 宏定义的测试用例
