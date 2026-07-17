from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent
PDF_DIR = ROOT / "pdf"
PDF_DIR.mkdir(exist_ok=True)


def build_pdf(image_path: Path, output_path: Path) -> None:
    with Image.open(image_path) as img:
        rgb = img.convert("RGB")
        rgb.save(output_path, "PDF", resolution=150.0)


def main() -> None:
    targets = []
    targets.extend(sorted((ROOT / "genuine").glob("genuine_0[1-5]_*.png")))
    targets.extend(sorted((ROOT / "fake").glob("fake_0[1-5]_*.png")))

    for image_path in targets:
      output_path = PDF_DIR / image_path.with_suffix(".pdf").name
      build_pdf(image_path, output_path)

    print(f"Generated {len(targets)} PDF files in {PDF_DIR}")


if __name__ == "__main__":
    main()
