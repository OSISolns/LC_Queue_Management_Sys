"""
socket_instance.py
------------------
Single Socket.IO server instance shared across the application.

Routers that need to emit real-time events import `sio` from here
instead of creating their own instance, which would break the ASGI wrapper.
"""
__author__ = "Valery Structure"
import socketio

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
