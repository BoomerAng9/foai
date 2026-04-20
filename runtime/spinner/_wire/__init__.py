"""Generated protobuf bindings for deploy.spinner.shield.v1.

Regenerate with:
    python -m grpc_tools.protoc \\
        --proto_path=runtime/spinner/schema \\
        --python_out=runtime/spinner/_wire \\
        --mypy_out=runtime/spinner/_wire \\
        runtime/spinner/schema/invocation.proto

Do not edit `invocation_pb2.py` or `invocation_pb2.pyi` by hand — they
are emitted by `protoc` from the canonical schema and will be overwritten
on the next regeneration.
"""

from . import invocation_pb2 as wire

__all__ = ["wire"]
