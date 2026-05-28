"use client";

import { useMemo, useState } from "react";

export type SearchableSelectOption = {
  value: string;
  label: string;
  description?: string;
  swatch?: string;
};

export function SearchableSelect({
  name,
  value,
  options,
  onChange,
  placeholder = "Поиск",
  required = false
}: {
  name: string;
  value: string;
  options: SearchableSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const selected = options.find((option) => option.value === value);
  const [query, setQuery] = useState(selected?.label ?? value);
  const [isOpen, setIsOpen] = useState(false);
  const visibleOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? options.filter((option) =>
          `${option.label} ${option.description ?? ""}`.toLowerCase().includes(needle)
        )
      : options;
    return filtered.slice(0, 12);
  }, [options, query]);

  function select(option: SearchableSelectOption) {
    onChange(option.value);
    setQuery(option.label);
    setIsOpen(false);
  }

  return (
    <div className="search-select">
      <input type="hidden" name={name} value={selected?.value ?? value} required={required} />
      <input
        className="field search-select-input"
        value={query}
        placeholder={placeholder}
        onFocus={() => setIsOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onBlur={() => {
          window.setTimeout(() => {
            setIsOpen(false);
            setQuery((options.find((option) => option.value === value)?.label ?? value).trim());
          }, 120);
        }}
      />
      {isOpen ? (
        <div className="search-select-menu">
          {visibleOptions.length > 0 ? (
            visibleOptions.map((option) => (
              <button
                className={`search-select-option ${option.value === value ? "selected" : ""}`}
                type="button"
                key={option.value}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => select(option)}
              >
                {option.swatch ? <span className="swatch small" style={{ background: option.swatch }} /> : null}
                <span>
                  <strong>{option.label}</strong>
                  {option.description ? <small>{option.description}</small> : null}
                </span>
              </button>
            ))
          ) : (
            <div className="search-select-empty">Ничего не найдено</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
