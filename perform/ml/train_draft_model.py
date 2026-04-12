"""
Phase 3: Train Draft Probability Models using XGBoost.

Model 1: Pick predictor — predict which POSITION gets picked next
          (multi-class classification over 15 positions)
Model 2: Trade predictor — predict P(trade) at each pick slot
          (binary classification)

Train/test split: 2000-2023 train, 2024-2025 test.
Models saved to foai/perform/ml/models/ as joblib files.
"""
import sys
import json
import numpy as np
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import joblib
import xgboost as xgb
from sklearn.metrics import (
    accuracy_score, classification_report, top_k_accuracy_score,
    roc_auc_score, f1_score
)
from features import FeatureBuilder, POSITIONS, POS_TO_IDX

MODELS_DIR = Path(__file__).resolve().parent / "models"
MODELS_DIR.mkdir(exist_ok=True)


def train_pick_predictor(fb: FeatureBuilder):
    """
    Train Model 1: Position prediction (multi-class XGBoost).
    """
    print("\n" + "=" * 60)
    print("Training Model 1: Pick Position Predictor")
    print("=" * 60)

    X_train, y_train, X_test, y_test, feature_names = fb.build_training_data(
        min_season=2000, max_season=2025, test_seasons=(2024, 2025)
    )

    model = xgb.XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=5,
        objective='multi:softprob',
        num_class=len(POSITIONS),
        eval_metric='mlogloss',
        random_state=42,
        n_jobs=-1,
        verbosity=1,
    )

    print("Training...")
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )

    # Evaluate
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)

    accuracy = accuracy_score(y_test, y_pred)
    # Top-3 accuracy: was the correct position in the top 3 predictions?
    top3_acc = top_k_accuracy_score(y_test, y_proba, k=3, labels=list(range(len(POSITIONS))))
    # Top-5 accuracy
    top5_acc = top_k_accuracy_score(y_test, y_proba, k=5, labels=list(range(len(POSITIONS))))

    print(f"\n--- Pick Predictor Results (2024-2025 test set) ---")
    print(f"  Exact position accuracy: {accuracy:.1%}")
    print(f"  Top-3 accuracy:          {top3_acc:.1%}")
    print(f"  Top-5 accuracy:          {top5_acc:.1%}")

    print(f"\nClassification Report:")
    report = classification_report(y_test, y_pred, target_names=POSITIONS, zero_division=0)
    print(report)

    # Feature importance
    importances = model.feature_importances_
    top_features = sorted(zip(feature_names, importances), key=lambda x: -x[1])[:15]
    print("Top 15 features:")
    for name, imp in top_features:
        print(f"  {name:25s} {imp:.4f}")

    # Save model
    model_path = MODELS_DIR / "pick_predictor.joblib"
    joblib.dump(model, model_path)
    print(f"\nModel saved to {model_path}")

    # Save metadata
    meta = {
        'feature_names': feature_names,
        'positions': POSITIONS,
        'num_features': len(feature_names),
        'train_seasons': '2000-2023',
        'test_seasons': '2024-2025',
        'accuracy': round(accuracy, 4),
        'top3_accuracy': round(top3_acc, 4),
        'top5_accuracy': round(top5_acc, 4),
        'n_estimators': 300,
        'max_depth': 6,
    }
    with open(MODELS_DIR / "pick_predictor_meta.json", 'w') as f:
        json.dump(meta, f, indent=2)

    return model, accuracy, top3_acc


def train_trade_predictor(fb: FeatureBuilder):
    """
    Train Model 2: Trade predictor (binary XGBoost).
    """
    print("\n" + "=" * 60)
    print("Training Model 2: Trade Predictor")
    print("=" * 60)

    X_train, y_train, X_test, y_test = fb.build_trade_training_data(
        min_season=2000, max_season=2025, test_seasons=(2024, 2025)
    )

    # Class weights for imbalanced data (trades are ~13% of picks)
    scale_pos = (y_train == 0).sum() / max((y_train == 1).sum(), 1)

    model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.1,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=scale_pos,
        objective='binary:logistic',
        eval_metric='auc',
        random_state=42,
        n_jobs=-1,
        verbosity=1,
    )

    print("Training...")
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )

    # Evaluate
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    auc = roc_auc_score(y_test, y_proba)
    f1 = f1_score(y_test, y_pred)
    accuracy = accuracy_score(y_test, y_pred)
    trade_rate_pred = y_pred.mean()
    trade_rate_actual = y_test.mean()

    print(f"\n--- Trade Predictor Results (2024-2025 test set) ---")
    print(f"  AUC:            {auc:.3f}")
    print(f"  F1 Score:       {f1:.3f}")
    print(f"  Accuracy:       {accuracy:.1%}")
    print(f"  Pred trade rate: {trade_rate_pred:.1%}")
    print(f"  True trade rate: {trade_rate_actual:.1%}")

    # Save model
    model_path = MODELS_DIR / "trade_predictor.joblib"
    joblib.dump(model, model_path)
    print(f"\nModel saved to {model_path}")

    # Save metadata
    meta = {
        'num_features': X_train.shape[1],
        'train_seasons': '2000-2023',
        'test_seasons': '2024-2025',
        'auc': round(auc, 4),
        'f1': round(f1, 4),
        'accuracy': round(accuracy, 4),
        'n_estimators': 200,
        'max_depth': 4,
    }
    with open(MODELS_DIR / "trade_predictor_meta.json", 'w') as f:
        json.dump(meta, f, indent=2)

    return model, auc


def main():
    print("=" * 60)
    print("NFL Draft ML Pipeline — Phase 3: Model Training")
    print("=" * 60)

    fb = FeatureBuilder()
    fb.load()

    pick_model, pick_acc, pick_top3 = train_pick_predictor(fb)
    trade_model, trade_auc = train_trade_predictor(fb)

    print("\n" + "=" * 60)
    print("Training Summary:")
    print(f"  Pick predictor accuracy: {pick_acc:.1%} (top-3: {pick_top3:.1%})")
    print(f"  Trade predictor AUC:     {trade_auc:.3f}")
    print(f"  Models saved to:         {MODELS_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    main()
