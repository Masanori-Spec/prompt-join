cmake_minimum_required(VERSION 3.22)
project(promptjoin_native_probe LANGUAGES CXX)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTOUIC ON)
find_package(Qt6 6.7.2 REQUIRED COMPONENTS Core Gui Widgets Qml Quick Network)
if(NOT DEFINED QPROMPT_SOURCE)
  message(FATAL_ERROR "QPROMPT_SOURCE must point to verified temporary upstream files")
endif()
add_executable(promptjoin-probe probe.cpp
  ${QPROMPT_SOURCE}/documenthandler.cpp ${QPROMPT_SOURCE}/documenthandler.h
  ${QPROMPT_SOURCE}/markersmodel.cpp ${QPROMPT_SOURCE}/markersmodel.h
  ${QPROMPT_SOURCE}/marker.hpp
  ${QPROMPT_SOURCE}/systemfontchooserdialog.cpp
  ${QPROMPT_SOURCE}/systemfontchooserdialog.h
  ${QPROMPT_SOURCE}/systemfontchooserdialog.ui)
target_include_directories(promptjoin-probe PRIVATE ${QPROMPT_SOURCE})
target_link_libraries(promptjoin-probe PRIVATE Qt6::Core Qt6::Gui Qt6::Widgets Qt6::Qml Qt6::Quick Qt6::Network)
