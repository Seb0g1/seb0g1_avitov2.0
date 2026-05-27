"use client";

import { ChangeEvent, useRef, useState } from "react";
import { FileCode, Upload } from "lucide-react";
import type { ClothingCategoryOption } from "@/lib/avitoOptions";

export function ClothingCategoryTemplateImporter({
  initialCategories
}: {
  initialCategories: ClothingCategoryOption[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState(initialCategories);
  const [message, setMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function importTemplate(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setIsUploading(true);
    setMessage("Импортирую XML-шаблон категории...");
    const formData = new FormData();
    formData.set("file", file);

    try {
      const response = await fetch("/api/avito/clothing-categories", {
        method: "POST",
        body: formData
      });
      const body = (await response.json().catch(() => null)) as {
        category?: ClothingCategoryOption;
        categories?: ClothingCategoryOption[];
        message?: string;
      } | null;

      if (!response.ok) {
        setMessage(body?.message ?? "Не удалось импортировать XML-шаблон.");
        return;
      }

      if (body?.categories) {
        setCategories(body.categories);
      }
      setMessage(
        body?.category
          ? `Категория добавлена: ${body.category.goodsType} / ${body.category.label}.`
          : "Категория добавлена."
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <section className="editor-section">
      <div className="toolbar">
        <FileCode size={18} aria-hidden />
        <h2>Категории одежды Avito</h2>
      </div>

      <div className="toolbar">
        {message ? <span className="muted">{message}</span> : null}
        <input
          ref={inputRef}
          type="file"
          accept=".xml,text/xml,application/xml"
          style={{ display: "none" }}
          onChange={importTemplate}
        />
        <button
          className="button primary"
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
        >
          <Upload size={18} aria-hidden />
          Импорт XML-шаблона
        </button>
      </div>

      <div className="chip-line" style={{ marginTop: 12 }}>
        {categories.map((category) => (
          <span className="data-chip" key={category.key}>
            {category.goodsType} / {category.label}
            {category.extraField ? ` / ${category.extraField}` : ""}
          </span>
        ))}
      </div>
    </section>
  );
}
