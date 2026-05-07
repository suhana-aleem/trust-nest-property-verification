import os
import argparse
from typing import Tuple
import tensorflow as tf


def build_signature_cnn(input_shape: Tuple[int, int, int] = (128, 128, 1)) -> tf.keras.Model:
    model = tf.keras.Sequential(
        [
            tf.keras.layers.Input(shape=input_shape),
            tf.keras.layers.Conv2D(32, (3, 3), activation="relu"),
            tf.keras.layers.MaxPooling2D((2, 2)),
            tf.keras.layers.Conv2D(64, (3, 3), activation="relu"),
            tf.keras.layers.MaxPooling2D((2, 2)),
            tf.keras.layers.Conv2D(128, (3, 3), activation="relu"),
            tf.keras.layers.MaxPooling2D((2, 2)),
            tf.keras.layers.Flatten(),
            tf.keras.layers.Dense(256, activation="relu"),
            tf.keras.layers.Dropout(0.4),
            tf.keras.layers.Dense(1, activation="sigmoid"),
        ]
    )
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=1e-4),
        loss="binary_crossentropy",
        metrics=["accuracy", tf.keras.metrics.AUC(name="auc")],
    )
    return model


def build_dataset(data_dir: str, img_size=(128, 128), batch_size: int = 32):
    train_ds = tf.keras.utils.image_dataset_from_directory(
        data_dir,
        validation_split=0.2,
        subset="training",
        seed=42,
        color_mode="grayscale",
        image_size=img_size,
        batch_size=batch_size,
        label_mode="binary",
    )
    val_ds = tf.keras.utils.image_dataset_from_directory(
        data_dir,
        validation_split=0.2,
        subset="validation",
        seed=42,
        color_mode="grayscale",
        image_size=img_size,
        batch_size=batch_size,
        label_mode="binary",
    )

    normalization = tf.keras.layers.Rescaling(1.0 / 255)
    train_ds = train_ds.map(lambda x, y: (normalization(x), y)).prefetch(tf.data.AUTOTUNE)
    val_ds = val_ds.map(lambda x, y: (normalization(x), y)).prefetch(tf.data.AUTOTUNE)
    return train_ds, val_ds


def main():
    parser = argparse.ArgumentParser(description="Train CNN for signature verification")
    parser.add_argument(
        "--data_dir",
        default="sample_data/signature_dataset",
        help="Dataset root containing class folders genuine/forged",
    )
    parser.add_argument("--epochs", type=int, default=15)
    parser.add_argument("--batch_size", type=int, default=32)
    parser.add_argument("--model_out", default="models/signature_cnn.h5")
    args = parser.parse_args()

    os.makedirs(os.path.dirname(args.model_out), exist_ok=True)
    train_ds, val_ds = build_dataset(args.data_dir, batch_size=args.batch_size)
    model = build_signature_cnn()

    callbacks = [
        tf.keras.callbacks.EarlyStopping(
            monitor="val_loss", patience=4, restore_best_weights=True
        )
    ]
    model.fit(train_ds, validation_data=val_ds, epochs=args.epochs, callbacks=callbacks)

    model.save(args.model_out)
    print(f"Model saved to: {args.model_out}")


if __name__ == "__main__":
    main()
