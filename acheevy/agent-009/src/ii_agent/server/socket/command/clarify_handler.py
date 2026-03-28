"""Handler for clarify command - NTNTN + SME_ANG orchestration."""

from typing import Dict, Any

from pydantic import ValidationError

from ii_agent.core.event import EventType, RealtimeEvent
from ii_agent.core.event_stream import EventStream
from ii_agent.server.models.sessions import SessionInfo
from ii_agent.server.socket.command.command_handler import (
    CommandHandler,
    UserCommandType,
)
from ii_agent.utils.ntntn_converter import (
    ntntn_translate,
    needs_clarification,
)
from ii_agent.utils.sme_ang_generator import (
    clarification_question_for,
    get_clarification_engine_label,
)


class ClarifyHandler(CommandHandler):
    """Handler for clarify command - runs NTNTN+SME_ANG pipeline."""

    def __init__(self, event_stream: EventStream) -> None:
        """Initialize the clarify handler with required dependencies.

        Args:
            event_stream: Event stream for publishing events
        """
        super().__init__(event_stream=event_stream)

    def get_command_type(self) -> UserCommandType:
        return UserCommandType.CLARIFY

    async def handle(self, content: Dict[str, Any], session_info: SessionInfo) -> None:
        """Handle clarification request with NTNTN+SME_ANG pipeline.
        
        Flow:
        1. Extract user message from content
        2. Run NTNTN translation (layman → technical)
        3. Check if clarification needed
        4. If needed: Generate SME_ANG question, emit CLARIFICATION_REQUIRED
        5. If not needed: Emit CLARIFICATION_PASSED with translation
        
        Args:
            content: Command content with 'message' field
            session_info: Session information
        """
        try:
            # Extract user message
            user_message = content.get("message", "").strip()
            if not user_message:
                await self._send_error_event(
                    session_info.id,
                    message="Message is required for clarification check",
                    error_type="validation_error",
                )
                return

            # Step 1: NTNTN Translation
            technical_translation = ntntn_translate(user_message)

            # Step 2: Check if clarification needed
            if needs_clarification(user_message, technical_translation):
                # Step 3: Generate SME_ANG clarification question
                clarification_question = clarification_question_for(user_message)
                
                # Emit CLARIFICATION_REQUIRED event
                await self.send_event(
                    RealtimeEvent(
                        type=EventType.CLARIFICATION_REQUIRED,
                        session_id=session_info.id,
                        content={
                            "clarification_required": True,
                            "question": clarification_question,
                            "technical_translation": technical_translation,
                            "engine": get_clarification_engine_label(),
                            "original_message": user_message,
                        },
                    )
                )
            else:
                # Emit CLARIFICATION_PASSED event
                await self.send_event(
                    RealtimeEvent(
                        type=EventType.CLARIFICATION_PASSED,
                        session_id=session_info.id,
                        content={
                            "clarification_required": False,
                            "technical_translation": technical_translation,
                            "engine": get_clarification_engine_label(),
                            "original_message": user_message,
                        },
                    )
                )

        except ValidationError as e:
            await self._send_error_event(
                str(session_info.id),
                message=f"Invalid clarify content: {str(e)}",
                error_type="validation_error",
            )
        except Exception as e:
            await self._send_error_event(
                str(session_info.id),
                message=f"Clarification check failed: {str(e)}",
                error_type="internal_error",
            )
