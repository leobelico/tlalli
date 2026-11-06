"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/lib/validation/common";

type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const FormStateContext = createContext<ActionState>({});
const FormPendingContext = createContext(false);

export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  onSuccess,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  onSuccess?: (state: ActionState) => void;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) {
      if (resetOnSuccess) ref.current?.reset();
      onSuccess?.(state);
    }
  }, [state, resetOnSuccess, onSuccess]);
  return (
    <FormStateContext.Provider value={state}>
      <FormPendingContext.Provider value={pending}>
        {/* Dispatch manually so React does not reset the fields when validation fails. */}
        <form
          ref={ref}
          className={className}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(() => formAction(fd));
          }}
        >
          {children}
          <FormMessage />
        </form>
      </FormPendingContext.Provider>
    </FormStateContext.Provider>
  );
}

export function useFormState() {
  return useContext(FormStateContext);
}

export function FormMessage() {
  const state = useFormState();
  if (state.error) {
    return (
      <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
        {state.error}
      </p>
    );
  }
  if (state.ok && state.message) {
    return (
      <p role="status" className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        {state.message}
      </p>
    );
  }
  return null;
}

export function FieldError({ name }: { name: string }) {
  const errors = useFormState().fieldErrors?.[name];
  if (!errors?.length) return null;
  return <p className="mt-1 text-xs text-red-600">{errors[0]}</p>;
}

export function Field({
  label,
  name,
  hint,
  children,
}: {
  label: string;
  name: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="label">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-stone-500">{hint}</p> : null}
      <FieldError name={name} />
    </div>
  );
}

export function SubmitButton({
  children,
  pendingText = "Guardando…",
  className = "btn-primary",
}: {
  children: ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const ctxPending = useContext(FormPendingContext);
  const { pending: nativePending } = useFormStatus();
  const pending = ctxPending || nativePending;
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}
