import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function created<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function empty(status = 204) {
  return new NextResponse(null, { status });
}

export function apiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "VALIDATION_ERROR", message: "Проверьте заполненные поля.", issues: error.flatten() },
      { status: 400 }
    );
  }

  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Нужно войти в админку." },
      { status: 401 }
    );
  }

  const message = error instanceof Error ? error.message : "Неизвестная ошибка";
  return NextResponse.json(
    { error: "INTERNAL_ERROR", message },
    { status: 500 }
  );
}
