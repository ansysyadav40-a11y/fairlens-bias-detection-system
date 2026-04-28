import shap
import lime
import lime.lime_tabular
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Non-interactive backend — must be before pyplot import
import matplotlib.pyplot as plt
import io, base64
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split


def prepare_model_and_data(df: pd.DataFrame, label_col: str, protected_attr: str):
    """Train a model and return everything needed for explanation"""
    df = df.copy()
    df.dropna(inplace=True)

    encoders = {}
    for col in df.columns:
        if df[col].dtype == object:
            le = LabelEncoder()
            df[col] = le.fit_transform(df[col].astype(str))
            encoders[col] = le

    feature_cols = [c for c in df.columns if c != label_col]
    X = df[feature_cols].values
    y = df[label_col].values

    # Binary label
    unique_vals = sorted(np.unique(y))
    if len(unique_vals) == 2:
        mapping = {unique_vals[0]: 0, unique_vals[1]: 1}
        y = np.array([mapping[v] for v in y])

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.3, random_state=42
    )

    model = LogisticRegression(max_iter=1000, random_state=42)
    model.fit(X_train, y_train)

    return model, X_train, X_test, y_test, feature_cols, df


def fig_to_base64(fig):
    """Convert matplotlib figure to base64 PNG string"""
    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight', dpi=120)
    buf.seek(0)
    encoded = base64.b64encode(buf.read()).decode('utf-8')
    plt.close(fig)
    return encoded


def run_shap_explanation(df: pd.DataFrame, label_col: str, protected_attr: str):
    """
    Run SHAP analysis.
    Returns: feature importance dict + base64 summary plot image.
    """
    model, X_train, X_test, y_test, feature_cols, _ = prepare_model_and_data(
        df, label_col, protected_attr
    )

    # Use LinearExplainer (fast for logistic regression)
    explainer   = shap.LinearExplainer(model, X_train, feature_perturbation="interventional")
    shap_values = explainer.shap_values(X_test)

    # Mean absolute SHAP value per feature
    mean_shap = np.abs(shap_values).mean(axis=0)
    importance = dict(sorted(
        zip(feature_cols, mean_shap.tolist()),
        key=lambda x: x[1], reverse=True
    ))

    # ── Bar chart of top 10 features ─────────────────────────────────────
    top_features = list(importance.keys())[:10]
    top_values   = [importance[f] for f in top_features]

    colors = ['#ef4444' if f == protected_attr else '#6366f1' for f in top_features]

    fig, ax = plt.subplots(figsize=(8, 5))
    bars = ax.barh(top_features[::-1], top_values[::-1], color=colors[::-1])
    ax.set_xlabel('Mean |SHAP value|', fontsize=11)
    ax.set_title('Feature Importance (SHAP)', fontsize=13, fontweight='bold')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)

    # Highlight protected attribute in legend
    from matplotlib.patches import Patch
    legend_elements = [
        Patch(facecolor='#ef4444', label=f'Protected: {protected_attr}'),
        Patch(facecolor='#6366f1', label='Other features')
    ]
    ax.legend(handles=legend_elements, loc='lower right', fontsize=9)

    # Value labels
    for bar, val in zip(bars, top_values[::-1]):
        ax.text(val + 0.001, bar.get_y() + bar.get_height()/2,
                f'{val:.4f}', va='center', fontsize=9)

    fig.tight_layout()
    shap_chart = fig_to_base64(fig)

    # ── Proxy bias detection ─────────────────────────────────────────────
    protected_idx = feature_cols.index(protected_attr) if protected_attr in feature_cols else None
    protected_shap = float(mean_shap[protected_idx]) if protected_idx is not None else 0

    # Features with high SHAP that might proxy for protected attr
    proxy_threshold = protected_shap * 0.7
    potential_proxies = [
        f for f, v in importance.items()
        if v >= proxy_threshold and f != protected_attr and f != label_col
    ][:3]

    return {
        "feature_importance": {k: round(v, 6) for k, v in importance.items()},
        "top_10_features": top_features,
        "protected_attr_rank": top_features.index(protected_attr) + 1 if protected_attr in top_features else None,
        "protected_attr_shap": round(protected_shap, 6),
        "potential_proxy_features": potential_proxies,
        "shap_chart_base64": shap_chart,
    }


def run_lime_explanation(df: pd.DataFrame, label_col: str, protected_attr: str,
                         instance_index: int = 0):
    """
    Run LIME on a single instance.
    Returns: explanation dict + base64 bar chart.
    """
    model, X_train, X_test, y_test, feature_cols, _ = prepare_model_and_data(
        df, label_col, protected_attr
    )

    explainer = lime.lime_tabular.LimeTabularExplainer(
        X_train,
        feature_names=feature_cols,
        class_names=['Negative', 'Positive'],
        mode='classification',
        random_state=42
    )

    # Explain instance at given index (default: first test sample)
    instance = X_test[instance_index]
    actual   = int(y_test[instance_index])
    predicted = int(model.predict([instance])[0])

    explanation = explainer.explain_instance(
        instance,
        model.predict_proba,
        num_features=10,
        num_samples=500
    )

    lime_features = explanation.as_list()
    feature_names = [f[0] for f in lime_features]
    feature_weights = [f[1] for f in lime_features]

    # ── LIME bar chart ────────────────────────────────────────────────────
    colors = ['#ef4444' if w < 0 else '#22c55e' for w in feature_weights]

    fig, ax = plt.subplots(figsize=(8, 5))
    ax.barh(feature_names[::-1], feature_weights[::-1], color=colors[::-1])
    ax.axvline(x=0, color='black', linewidth=0.8)
    ax.set_xlabel('LIME Weight (positive = pushes toward class 1)', fontsize=10)
    ax.set_title(f'LIME Explanation — Instance #{instance_index}', fontsize=13, fontweight='bold')
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    fig.tight_layout()

    lime_chart = fig_to_base64(fig)

    return {
        "instance_index": instance_index,
        "actual_label": actual,
        "predicted_label": predicted,
        "correct_prediction": actual == predicted,
        "prediction_probability": float(model.predict_proba([instance])[0][1]),
        "lime_explanation": [
            {"feature": f, "weight": round(w, 6)}
            for f, w in zip(feature_names, feature_weights)
        ],
        "lime_chart_base64": lime_chart,
    }