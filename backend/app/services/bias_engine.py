import pandas as pd
import numpy as np
from aif360.datasets import BinaryLabelDataset
from aif360.metrics import BinaryLabelDatasetMetric, ClassificationMetric
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split


def preprocess_dataframe(df, label_col, protected_attr):
    df = df.copy()

    # Drop missing values
    df = df.dropna()

    # Convert categorical to numeric
    for col in df.columns:
        if df[col].dtype == object:
            df[col] = df[col].astype(str)
            df[col] = df[col].astype('category').cat.codes

    # Ensure label binary
    if df[label_col].nunique() > 2:
        df[label_col] = (df[label_col] > df[label_col].median()).astype(int)

    return df







def run_bias_audit(file_path: str, label_col: str, protected_attr: str):
    """
    Full 5-metric fairness audit using AIF360.
    """
 




   

    # 🔥 THIS LINE FIXES YOUR ERROR
  
    df = pd.read_csv(file_path)

    df = preprocess_dataframe(df, label_col, protected_attr)

    aif_dataset = BinaryLabelDataset(
        df=df,
        label_names=[label_col],
        protected_attribute_names=[protected_attr]
    )

    privileged_groups   = [{protected_attr: 1}]
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
        df=test_df, label_names=[label_col],
        protected_attribute_names=[protected_attr]
    )
    dataset_pred = BinaryLabelDataset(
        df=pred_df, label_names=[label_col],
        protected_attribute_names=[protected_attr]
    )

    dataset_metric = BinaryLabelDatasetMetric(
        aif_dataset,
        unprivileged_groups=unprivileged_groups,
        privileged_groups=privileged_groups
    )
    disparate_impact   = dataset_metric.disparate_impact()
    demographic_parity = dataset_metric.mean_difference()

    class_metric = ClassificationMetric(
        dataset_true, dataset_pred,
        unprivileged_groups=unprivileged_groups,
        privileged_groups=privileged_groups
    )
    equalized_odds      = class_metric.equalized_odds_difference()
    predictive_parity   = class_metric.difference(class_metric.positive_predictive_value)
    individual_fairness = float(class_metric.consistency()[0])

    di_score = min(disparate_impact, 1 / disparate_impact if disparate_impact > 0 else 0)
    dp_score = 1 - abs(demographic_parity)
    eo_score = 1 - abs(equalized_odds)
    pp_score = 1 - abs(predictive_parity)
    if_score = individual_fairness

    weights = [0.30, 0.20, 0.25, 0.15, 0.10]
    raw = [di_score, dp_score, eo_score, pp_score, if_score]
    fairness_score = round(sum(w * s for w, s in zip(weights, raw)) * 100, 1)

    if fairness_score >= 80:
        severity = "LOW"
        verdict  = "Model is reasonably fair."
    elif fairness_score >= 60:
        severity = "MEDIUM"
        verdict  = "Moderate bias detected."
    else:
        severity = "HIGH"
        verdict  = "Significant bias detected."

    return {
        "fairness_score": fairness_score,
        "severity": severity,
        "verdict": verdict,
    }