import pandas as pd
import numpy as np
from aif360.datasets import BinaryLabelDataset
from aif360.metrics import BinaryLabelDatasetMetric, ClassificationMetric
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split


def _read_file(file_path: str) -> pd.DataFrame:
    # Robust CSV read
    try:
        return pd.read_csv(file_path, encoding="utf-8", on_bad_lines="skip")
    except UnicodeDecodeError:
        return pd.read_csv(file_path, encoding="latin-1", on_bad_lines="skip")
    except Exception:
        # fallback parser for weird CSV formats
        return pd.read_csv(file_path, sep=None, engine="python", on_bad_lines="skip")


def preprocess_dataframe(df: pd.DataFrame, label_col: str, protected_attr: str) -> pd.DataFrame:
    df = df.copy().dropna()

    if label_col not in df.columns:
        raise ValueError(f"Label column '{label_col}' not found.")
    if protected_attr not in df.columns:
        raise ValueError(f"Protected attribute '{protected_attr}' not found.")

    # Encode categorical/object columns
    for col in df.columns:
        if df[col].dtype == object:
            df[col] = df[col].astype(str).astype("category").cat.codes

    # Ensure binary label
    if df[label_col].nunique() > 2:
        df[label_col] = pd.to_numeric(df[label_col], errors="coerce")
        df = df.dropna(subset=[label_col])
        df[label_col] = (df[label_col] > df[label_col].median()).astype(int)
    else:
        uniques = sorted(df[label_col].dropna().unique())
        if len(uniques) == 2 and set(uniques) != {0, 1}:
            mapping = {uniques[0]: 0, uniques[1]: 1}
            df[label_col] = df[label_col].map(mapping)

    if df[label_col].nunique() != 2:
        raise ValueError("Label column could not be converted to binary (0/1).")

    return df


def run_bias_audit(file_path: str, label_col: str, protected_attr: str):
    df = _read_file(file_path)
    df = preprocess_dataframe(df, label_col, protected_attr)

    aif_dataset = BinaryLabelDataset(
        df=df,
        label_names=[label_col],
        protected_attribute_names=[protected_attr],
    )

    privileged_groups = [{protected_attr: 1}]
    unprivileged_groups = [{protected_attr: 0}]

    feature_cols = [c for c in df.columns if c != label_col]
    X = df[feature_cols].values
    y = df[label_col].values

    X_train, X_test, y_train, y_test, idx_train, idx_test = train_test_split(
        X, y, np.arange(len(df)), test_size=0.3, random_state=42
    )

    model = LogisticRegression(max_iter=1000, random_state=42)
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    test_df = df.iloc[idx_test].copy()
    pred_df = test_df.copy()
    pred_df[label_col] = y_pred

    dataset_true = BinaryLabelDataset(
        df=test_df,
        label_names=[label_col],
        protected_attribute_names=[protected_attr],
    )
    dataset_pred = BinaryLabelDataset(
        df=pred_df,
        label_names=[label_col],
        protected_attribute_names=[protected_attr],
    )

    dataset_metric = BinaryLabelDatasetMetric(
        aif_dataset,
        unprivileged_groups=unprivileged_groups,
        privileged_groups=privileged_groups,
    )
    disparate_impact = dataset_metric.disparate_impact()
    demographic_parity = dataset_metric.mean_difference()

    class_metric = ClassificationMetric(
        dataset_true,
        dataset_pred,
        unprivileged_groups=unprivileged_groups,
        privileged_groups=privileged_groups,
    )
    equalized_odds = class_metric.equalized_odds_difference()
    predictive_parity = class_metric.difference(class_metric.positive_predictive_value)

    # AIF360 consistency returns array-like in some versions
    consistency = class_metric.consistency()
    individual_fairness = float(consistency[0]) if hasattr(consistency, "__len__") else float(consistency)

    di_score = min(disparate_impact, 1 / disparate_impact if disparate_impact and disparate_impact > 0 else 0)
    raw = [
        di_score,
        1 - abs(demographic_parity),
        1 - abs(equalized_odds),
        1 - abs(predictive_parity),
        individual_fairness,
    ]
    weights = [0.30, 0.20, 0.25, 0.15, 0.10]
    fairness_score = round(sum(w * s for w, s in zip(weights, raw)) * 100, 1)

    if fairness_score >= 80:
        severity, verdict = "LOW", "Model is reasonably fair. Minor monitoring recommended."
    elif fairness_score >= 60:
        severity, verdict = "MEDIUM", "Moderate bias detected. Review protected attribute impact."
    else:
        severity, verdict = "HIGH", "Significant bias detected. Mitigation required before deployment."

    return {
        "fairness_score": fairness_score,
        "severity": severity,
        "verdict": verdict,
        "metrics": {
            "disparate_impact": round(float(disparate_impact), 4),
            "demographic_parity_diff": round(float(demographic_parity), 4),
            "equalized_odds_diff": round(float(equalized_odds), 4),
            "predictive_parity_diff": round(float(predictive_parity), 4),
            "individual_fairness": round(float(individual_fairness), 4),
        },
        "model_accuracy": round(float(np.mean(y_pred == y_test)), 4),
        "protected_attribute": protected_attr,
        "label_column": label_col,
        "rows_audited": int(len(df)),
    }