from ii_agent.prompts.policy_layers import (
    build_policy_layer_prompt,
    select_policy_layers,
)


def test_select_policy_layers_rules_first():
    selection = select_policy_layers(
        user_query="Implement webhook trigger for deployment workflow",
        metadata={},
    )
    assert selection.strategy == "rules"
    assert "hooks" in selection.selected_layers
    assert "task" in selection.selected_layers


def test_select_policy_layers_classifier_fallback():
    selection = select_policy_layers(
        user_query="Summarize tradeoffs between model approaches",
        metadata={},
    )
    assert selection.strategy in {"classifier", "default"}
    assert selection.selected_layers


def test_select_policy_layers_metadata_override():
    selection = select_policy_layers(
        user_query="anything",
        metadata={"policy_layers_selected": ["skills", "hooks"]},
    )
    assert selection.strategy == "metadata"
    assert selection.selected_layers == ["hooks", "skills"]


def test_build_policy_layer_prompt_has_brain_precedence():
    prompt, details = build_policy_layer_prompt(
        {
            "user_query": "build an api",
            "policy_layers_selected": ["task"],
        }
    )

    assert "<acheevy_policy_package" in prompt
    assert 'name="brain"' in prompt
    assert 'name="agent"' in prompt
    assert details["policy_layers_loaded"][0] == "brain"


def test_build_policy_layer_prompt_respects_disable_flag():
    prompt, details = build_policy_layer_prompt(
        {
            "user_query": "build an api",
            "policy_layers_enabled": False,
        }
    )

    assert prompt == ""
    assert details["policy_strategy"] == "disabled"
    assert details["policy_reason_codes"] == ["policy_layers_disabled"]


def test_build_policy_layer_prompt_shadow_mode():
    prompt, details = build_policy_layer_prompt(
        {
            "user_query": "deploy with webhook integration",
            "policy_layers_shadow_mode": True,
        }
    )

    assert prompt == ""
    assert details["policy_layers_loaded"] == []
    assert "policy_layers_shadow_mode" in details["policy_reason_codes"]
    assert details["policy_shadow_selected"]
