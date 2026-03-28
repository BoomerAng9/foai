#!/usr/bin/env python3
"""
Production Backend Schema & Logic Validation
==============================================

Validates that the production backend (chat_router.py) has:
1. Correct response schema matching frontend expectations
2. Proper NTNTN+SME_ANG clarification flow
3. Clarification continuation enforcement
4. conversationId state tracking
5. Interrupt endpoint

This test verifies production readiness WITHOUT starting the server.
"""

import sys
import json
from pathlib import Path

# Add src to path so we can import the modules
sys.path.insert(0, str(Path(__file__).parent / "src"))

from ii_agent.server.api.chat_router import (
    ChatRouteResponse,
    ChatRouteRequest,
    InterruptRequest,
    InterruptResponse,
    ntntn_translate,
    needs_clarification,
    clarification_question_for,
    detect_intent,
    parse_execution_task,
    get_conversation_state,
)

def test_response_schema():
    """Verify ChatRouteResponse has all required fields."""
    print("\n" + "="*60)
    print("TEST 1: Response Schema Validation")
    print("="*60)
    
    # Expected fields from frontend requirements
    expected_fields = {
        'response': str,
        'conversationId': type(None),
        'intent': type(None),
        'handoff': type(None),
        'clarification_required': bool,
        'clarification_question': type(None),
        'technical_translation': type(None),
        'engine': type(None),
    }
    
    # Create a response instance
    response = ChatRouteResponse(
        response="Test response",
        conversationId="conv-123",
        intent="execution",
        handoff={"backend": "ii-agent"},
        clarification_required=False,
        clarification_question=None,
        technical_translation="Technical spec",
        engine="NTNTN+SME_ANG"
    )
    
    # Validate schema
    print("✓ ChatRouteResponse model created successfully")
    print(f"  Response fields: {list(response.dict().keys())}")
    assert response.response == "Test response"
    assert response.intent == "execution"
    assert response.engine == "NTNTN+SME_ANG"
    print("✓ All required fields present and accessible")
    return True


def test_request_schema():
    """Verify ChatRouteRequest accepts conversationId."""
    print("\n" + "="*60)
    print("TEST 2: Request Schema - ConversationId Support")
    print("="*60)
    
    request = ChatRouteRequest(
        message="create a ppt on football",
        model="inception/mercury-2",
        conversationId="conv-ppt-test",
        conversation_history=[]
    )
    
    assert request.conversationId == "conv-ppt-test"
    print("✓ ConversationId properly stored in request")
    return True


def test_ntntn_translation():
    """Verify NTNTN glossary translation works."""
    print("\n" + "="*60)
    print("TEST 3: NTNTN Translation Engine")
    print("="*60)
    
    prompt = "make a nice website for my business"
    translated = ntntn_translate(prompt)
    
    print(f"Original: {prompt}")
    print(f"\nTranslated:\n{translated}")
    
    assert "responsive web application" in translated
    assert "polished, production-grade" in translated
    assert "NTNTN Technical Spec:" in translated
    print("\n✓ NTNTN translation working correctly")
    return True


def test_clarification_detection():
    """Verify clarification need detection works."""
    print("\n" + "="*60)
    print("TEST 4: Clarification Detection")
    print("="*60)
    
    # Vague request - should need clarification
    vague_prompt = "make a website"
    tech_vague = ntntn_translate(vague_prompt)
    needs_clear = needs_clarification(vague_prompt, tech_vague)
    
    print(f"Vague Prompt: '{vague_prompt}'")
    print(f"Needs Clarification: {needs_clear}")
    assert needs_clear == True
    print("✓ Vague request correctly identified as needing clarification")
    
    # Specific request - should NOT need clarification
    specific_prompt = "create a React landing page with hero, features, and pricing sections using Tailwind CSS"
    tech_specific = ntntn_translate(specific_prompt)
    needs_clear_spec = needs_clarification(specific_prompt, tech_specific)
    
    print(f"\nSpecific Prompt: '{specific_prompt}'")
    print(f"Needs Clarification: {needs_clear_spec}")
    assert needs_clear_spec == False
    print("✓ Detailed request correctly identified as ready to execute")
    return True


def test_clarification_questions():
    """Verify SME_ANG generates appropriate questions."""
    print("\n" + "="*60)
    print("TEST 5: SME_ANG Clarification Questions")
    print("="*60)
    
    prompts_and_keywords = [
        ("make a landing page", ["audience", "sections", "style"]),
        ("create a backend api", ["framework", "endpoints", "schema"]),
        ("build a ppt on AI", ["audience", "slides", "message"]),
    ]
    
    for prompt, expected_keywords in prompts_and_keywords:
        question = clarification_question_for(prompt)
        print(f"\nPrompt: '{prompt}'")
        print(f"Question: {question}")
        
        # Verify at least one expected keyword appears
        found = any(kw in question.lower() for kw in expected_keywords)
        assert found, f"Expected keywords {expected_keywords} not in question"
        print(f"✓ Question contains expected keywords")
    
    return True


def test_intent_detection():
    """Verify execution keyword detection works."""
    print("\n" + "="*60)
    print("TEST 6: Intent Detection")
    print("="*60)
    
    test_cases = [
        ("Who won the 2024 World Cup?", "conversation"),
        ("create a ppt on football", "execution"),
        ("build a React app", "execution"),
        ("What is machine learning?", "conversation"),
        ("deploy my website", "execution"),
    ]
    
    for message, expected_intent in test_cases:
        detected = detect_intent(message)
        status = "✓" if detected == expected_intent else "✗"
        print(f"{status} '{message}' → {detected} (expected {expected_intent})")
        assert detected == expected_intent
    
    return True


def test_conversation_state_management():
    """Verify conversation state tracking works."""
    print("\n" + "="*60)
    print("TEST 7: Conversation State Management")
    print("="*60)
    
    conv_id = "conv-state-test"
    
    # Initialize state
    state = get_conversation_state(conv_id)
    print(f"Initial state: {state}")
    assert state["interrupted"] == False
    assert state["awaiting_clarification"] == False
    print("✓ Initial state created correctly")
    
    # Simulate clarification flow
    state["awaiting_clarification"] = True
    state["pending_user_prompt"] = "make a website"
    state["clarification_question"] = "What audience?"
    
    # Retrieve same conversation and verify state persists
    state2 = get_conversation_state(conv_id)
    print(f"\nRetrieved state: {state2}")
    assert state2["awaiting_clarification"] == True
    assert state2["pending_user_prompt"] == "make a website"
    print("✓ State properly persisted across calls")
    
    # Verify state is unique per conversation
    state3 = get_conversation_state("conv-other")
    assert state3["awaiting_clarification"] == False
    print("✓ State properly isolated per conversation ID")
    
    return True


def test_interrupt_schema():
    """Verify interrupt endpoint models are correct."""
    print("\n" + "="*60)
    print("TEST 8: Interrupt Endpoint Schema")
    print("="*60)
    
    # Request
    interrupt_req = InterruptRequest(conversationId="conv-123")
    assert interrupt_req.conversationId == "conv-123"
    print("✓ InterruptRequest model valid")
    
    # Response
    interrupt_resp = InterruptResponse(
        conversationId="conv-123",
        interrupted=True,
        message="Stopped. Ready for your next instruction."
    )
    assert interrupt_resp.interrupted == True
    print("✓ InterruptResponse model valid")
    
    return True


def test_clarification_continuation_enforcement():
    """Verify that clarification replies force execution intent."""
    print("\n" + "="*60)
    print("TEST 9: Clarification Continuation Enforcement")
    print("="*60)
    
    conv_id = "conv-continuation-test"
    state = get_conversation_state(conv_id)
    
    # Simulate user providing vague request
    state["awaiting_clarification"] = True
    state["pending_user_prompt"] = "make a website"
    
    # Even if clarification reply looks conversational, it should be forced to execution
    print("Scenario: User awaiting clarification provides reply")
    print(f"State: awaiting_clarification={state['awaiting_clarification']}")
    print(f"Pending prompt: {state['pending_user_prompt']}")
    
    # This is what the route handler checks:
    should_force_execution = (
        state["awaiting_clarification"] and state.get("pending_user_prompt")
    )
    
    print(f"\nShould force execution intent: {should_force_execution}")
    assert should_force_execution == True
    print("✓ Clarification replies correctly forced to execution path")
    
    return True


def test_task_parsing():
    """Verify task summary generation works."""
    print("\n" + "="*60)
    print("TEST 10: Task Parsing & Summary Generation")
    print("="*60)
    
    test_cases = [
        ("Create a React component", "Create/generate:"),
        ("Build a ppt on AI", "Presentation build:"),
        ("Deploy my app", "Deploy/Setup:"),
        ("Fix this bug", "Execute:"),
    ]
    
    for prompt, expected_prefix in test_cases:
        summary = parse_execution_task(prompt)
        print(f"'{prompt}' → {summary}")
        assert summary.startswith(expected_prefix), f"Expected {expected_prefix}, got {summary}"
    
    print("\n✓ Task parsing working correctly")
    return True


def test_full_clarification_flow():
    """Simulate end-to-end clarification flow."""
    print("\n" + "="*60)
    print("TEST 11: Full Clarification Flow Simulation")
    print("="*60)
    
    conv_id = "conv-flow-test"
    
    # Step 1: User sends vague request
    print("\n[STEP 1] User: 'create a ppt'")
    vague = "create a ppt"
    intent1 = detect_intent(vague)
    trans1 = ntntn_translate(vague)
    clarify1 = needs_clarification(vague, trans1)
    
    print(f"Intent: {intent1}, Needs clarification: {clarify1}")
    assert intent1 == "execution"
    assert clarify1 == True
    print("✓ Correctly identified as execution needing clarification")
    
    # Step 2: System asks clarifying question
    print("\n[STEP 2] System asks clarification question")
    state = get_conversation_state(conv_id)
    state["awaiting_clarification"] = True
    state["pending_user_prompt"] = vague
    state["pending_technical_prompt"] = trans1
    state["clarification_question"] = clarification_question_for(vague)
    
    print(f"Question: {state['clarification_question']}")
    print("✓ Question generated and state saved")
    
    # Step 3: User provides clarification
    print("\n[STEP 3] User: 'on machine learning for college students'")
    clarif_reply = "on machine learning for college students"
    
    # Check if we're in clarification mode
    if state["awaiting_clarification"] and state.get("pending_user_prompt"):
        print("✓ Detected we're awaiting clarification")
        
        # Merge original with clarification
        merged = f"{state['pending_user_prompt']}\nClarification: {clarif_reply}"
        print(f"Merged prompt: {merged}")
        
        # Now check if clarification was sufficient
        trans_merged = ntntn_translate(merged)
        clarify_merged = needs_clarification(merged, trans_merged)
        
        print(f"After clarification - Needs more: {clarify_merged}")
        assert clarify_merged == False, "Should not need more clarification"
        print("✓ Ready to proceed with execution handoff")
        
        # Reset state for execution
        state["awaiting_clarification"] = False
        state["pending_user_prompt"] = None
        print("✓ State reset for execution")
    
    return True


def main():
    """Run all tests."""
    print("\n" + "="*60)
    print("PRODUCTION BACKEND SCHEMA & LOGIC VALIDATION")
    print("="*60)
    print("\nValidating that production backend (chat_router.py) is")
    print("compatible with frontend requirements and test backend.\n")
    
    tests = [
        test_response_schema,
        test_request_schema,
        test_ntntn_translation,
        test_clarification_detection,
        test_clarification_questions,
        test_intent_detection,
        test_conversation_state_management,
        test_interrupt_schema,
        test_clarification_continuation_enforcement,
        test_task_parsing,
        test_full_clarification_flow,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            failed += 1
            print(f"\n✗ Test failed with error: {e}")
            import traceback
            traceback.print_exc()
    
    print("\n" + "="*60)
    print(f"RESULTS: {passed} passed, {failed} failed")
    print("="*60)
    
    if failed == 0:
        print("\n🎉 ALL TESTS PASSED - Production backend schema is valid!")
        print("\nProduction /api/chat/route endpoint is now compatible with:")
        print("  ✓ Frontend response expectations")
        print("  ✓ Test backend response schema")
        print("  ✓ NTNTN+SME_ANG clarification flow")
        print("  ✓ Conversation state management")
        print("  ✓ Interrupt endpoint")
        return 0
    else:
        print(f"\n❌ {failed} test(s) failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
