import { useEffect, useMemo, useState, type FormEvent, type InputHTMLAttributes } from "react";
import type { FieldErrors, Participant, ParticipantInput } from "./types";

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  heightInches: "",
  weightPounds: "",
};

type FormValues = typeof emptyForm;

function validateForm(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.firstName.trim()) errors.firstName = "First name is required.";
  else if (values.firstName.trim().length > 100) errors.firstName = "Use 100 characters or fewer.";
  if (!values.lastName.trim()) errors.lastName = "Last name is required.";
  else if (values.lastName.trim().length > 100) errors.lastName = "Use 100 characters or fewer.";

  const email = values.email.trim();
  if (!email) errors.email = "Email is required.";
  else if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address.";

  const phone = values.phone.trim();
  const digits = phone.replace(/\D/g, "");
  if (!phone) errors.phone = "Phone number is required.";
  else if (phone.length > 25 || !/^\+?[0-9().\s-]+$/.test(phone) || digits.length < 7 || digits.length > 15) {
    errors.phone = "Enter a phone number with 7–15 digits; common formatting is allowed.";
  }

  const height = Number(values.heightInches);
  if (!values.heightInches.trim() || !Number.isFinite(height) || height <= 0) errors.heightInches = "Enter a height greater than zero.";
  const weight = Number(values.weightPounds);
  if (!values.weightPounds.trim() || !Number.isFinite(weight) || weight <= 0) errors.weightPounds = "Enter a weight greater than zero.";
  return errors;
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

async function responseError(response: Response): Promise<{ message: string; fieldErrors?: FieldErrors }> {
  try {
    const body = await response.json() as { error?: string; fieldErrors?: FieldErrors };
    return { message: body.error ?? "The request could not be completed.", fieldErrors: body.fieldErrors };
  } catch {
    return { message: "The request could not be completed. Please try again." };
  }
}

function ParticipantTable({ participants, emptyMessage }: { participants: Participant[]; emptyMessage: string }) {
  if (participants.length === 0) {
    return <div className="empty-state">{emptyMessage}</div>;
  }

  return (
    <div className="table-scroll">
      <table className="min-w-[840px] w-full border-collapse text-left">
        <thead>
          <tr>
            <th>Participant</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Height</th>
            <th>Weight</th>
            <th>BMI</th>
            <th>Added</th>
          </tr>
        </thead>
        <tbody>
          {participants.map((participant) => (
            <tr key={participant.id}>
              <td className="font-semibold text-ink">{participant.firstName} {participant.lastName}</td>
              <td>{participant.email}</td>
              <td>{participant.phone}</td>
              <td>{participant.heightInches} in</td>
              <td>{participant.weightPounds} lb</td>
              <td><span className="bmi-pill">{participant.bmi.toFixed(2)}</span></td>
              <td>{displayDate(participant.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [values, setValues] = useState<FormValues>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [minBmi, setMinBmi] = useState("");
  const [maxBmi, setMaxBmi] = useState("");
  const [filterError, setFilterError] = useState("");

  async function loadParticipants() {
    setIsLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/participants");
      if (!response.ok) {
        const error = await responseError(response);
        throw new Error(error.message);
      }
      setParticipants(await response.json() as Participant[]);
    } catch {
      setLoadError("We couldn't load participants. Check the API connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadParticipants();
  }, []);

  const filteredParticipants = useMemo(() => {
    const minimum = minBmi.trim() === "" ? null : Number(minBmi);
    const maximum = maxBmi.trim() === "" ? null : Number(maxBmi);
    if ((minimum !== null && (!Number.isFinite(minimum) || minimum < 0)) ||
        (maximum !== null && (!Number.isFinite(maximum) || maximum < 0))) {
      return [];
    }
    return participants.filter((participant) =>
      (minimum === null || participant.bmi >= minimum) &&
      (maximum === null || participant.bmi <= maximum),
    );
  }, [participants, minBmi, maxBmi]);

  function updateFilter(which: "min" | "max", value: string) {
    if (which === "min") setMinBmi(value);
    else setMaxBmi(value);

    const nextMin = which === "min" ? value : minBmi;
    const nextMax = which === "max" ? value : maxBmi;
    const minimum = nextMin.trim() === "" ? null : Number(nextMin);
    const maximum = nextMax.trim() === "" ? null : Number(nextMax);

    if ((minimum !== null && (!Number.isFinite(minimum) || minimum < 0)) ||
        (maximum !== null && (!Number.isFinite(maximum) || maximum < 0))) {
      setFilterError("Enter valid non-negative BMI values.");
    } else if (minimum !== null && maximum !== null && minimum > maximum) {
      setFilterError("Minimum BMI must not exceed maximum BMI.");
    } else {
      setFilterError("");
    }
  }

  async function submitParticipant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    const errors = validateForm(values);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const payload: ParticipantInput = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      email: values.email.trim().toLowerCase(),
      phone: values.phone.trim(),
      heightInches: Number(values.heightInches),
      weightPounds: Number(values.weightPounds),
    };

    setIsSaving(true);
    try {
      const response = await fetch("/api/participants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await responseError(response);
        setFieldErrors(error.fieldErrors ?? { _form: error.message });
        return;
      }

      const created = await response.json() as Participant;
      setParticipants((current) => [created, ...current]);
      setValues(emptyForm);
      setFieldErrors({});
      setNotice("Participant added successfully.");
    } catch {
      setFieldErrors({ _form: "We couldn't save this participant. Check the API connection and try again." });
    } finally {
      setIsSaving(false);
    }
  }

  const hasActiveFilter = minBmi.trim() !== "" || maxBmi.trim() !== "";

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="border-b border-[#e4ebe8] bg-white">
        <div className="page-width flex items-center justify-between py-5">
          <a href="#top" className="flex items-center gap-3 no-underline" aria-label="Curebase participant pre-screening home">
            <span className="brand-mark" aria-hidden="true">C</span>
            <span>
              <span className="block text-sm font-bold tracking-tight text-ink">curebase</span>
              <span className="block text-[11px] text-muted">Participant pre-screening</span>
            </span>
          </a>
          <span className="admin-chip"><span className="status-dot" /> Admin workspace</span>
        </div>
      </header>

      <main id="top" className="page-width pb-16 pt-9 sm:pt-12">
        <div className="mb-8 max-w-3xl">
          <p className="eyebrow">TRIAL OPERATIONS</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-[2.35rem]">Participant pre-screening</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted sm:text-base">
            Add participant details and review BMI information to support an initial eligibility pre-screen.
          </p>
        </div>

        <section className="card mb-7" aria-labelledby="add-participant-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">NEW RECORD</p>
              <h2 id="add-participant-heading" className="mt-1 text-xl font-semibold text-ink">Add a participant</h2>
            </div>
            <span className="required-note"><span aria-hidden="true">*</span> Required fields</span>
          </div>

          <form onSubmit={submitParticipant} noValidate>
            <div className="form-grid">
              <FormField label="First name" name="firstName" value={values.firstName} error={fieldErrors.firstName} onChange={(value) => setValues({ ...values, firstName: value })} autoComplete="given-name" />
              <FormField label="Last name" name="lastName" value={values.lastName} error={fieldErrors.lastName} onChange={(value) => setValues({ ...values, lastName: value })} autoComplete="family-name" />
              <FormField label="Email address" name="email" type="email" value={values.email} error={fieldErrors.email} onChange={(value) => setValues({ ...values, email: value })} autoComplete="email" />
              <FormField label="Phone number" name="phone" type="tel" value={values.phone} error={fieldErrors.phone} onChange={(value) => setValues({ ...values, phone: value })} autoComplete="tel" hint="Include country code if available." />
              <FormField label="Height (inches)" name="heightInches" type="number" value={values.heightInches} error={fieldErrors.heightInches} onChange={(value) => setValues({ ...values, heightInches: value })} min="0" step="any" />
              <FormField label="Weight (pounds)" name="weightPounds" type="number" value={values.weightPounds} error={fieldErrors.weightPounds} onChange={(value) => setValues({ ...values, weightPounds: value })} min="0" step="any" />
            </div>

            {fieldErrors._form && <p className="form-alert" role="alert">{fieldErrors._form}</p>}
            {notice && <p className="success-alert" role="status">{notice}</p>}
            <div className="mt-6 flex flex-col-reverse items-start gap-3 border-t border-[#edf1ef] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-muted">BMI is calculated from the submitted height and weight.</p>
              <button className="primary-button" type="submit" disabled={isSaving}>
                {isSaving ? <><span className="spinner" /> Saving…</> : <><span aria-hidden="true" className="text-lg leading-none">+</span> Add participant</>}
              </button>
            </div>
          </form>
        </section>

        <section className="card mb-7" aria-labelledby="all-participants-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">PARTICIPANT RECORDS</p>
              <h2 id="all-participants-heading" className="mt-1 text-xl font-semibold text-ink">All participants</h2>
            </div>
            <span className="count-chip">{participants.length} {participants.length === 1 ? "participant" : "participants"}</span>
          </div>
          {loadError ? (
            <div className="load-error" role="alert">
              <span>{loadError}</span>
              <button className="text-button" type="button" onClick={() => void loadParticipants()}>Try again</button>
            </div>
          ) : isLoading ? (
            <div className="empty-state">Loading participants…</div>
          ) : (
            <ParticipantTable participants={participants} emptyMessage="No participants have been added yet." />
          )}
        </section>

        <section className="card" aria-labelledby="filtered-participants-heading">
          <div className="section-heading filtered-heading">
            <div>
              <p className="eyebrow">DISPLAY-ONLY FILTER</p>
              <h2 id="filtered-participants-heading" className="mt-1 text-xl font-semibold text-ink">BMI-filtered participants</h2>
              <p className="mt-1 text-sm text-muted">Results appear here without changing saved records.</p>
            </div>
            <span className="count-chip">{filterError ? "—" : filteredParticipants.length} {filteredParticipants.length === 1 ? "match" : "matches"}</span>
          </div>

          <div className="filter-controls">
            <FormField label="Minimum BMI" name="minBmi" type="number" value={minBmi} error={undefined} onChange={(value) => updateFilter("min", value)} min="0" step="any" hint="Inclusive lower bound" required={false} />
            <FormField label="Maximum BMI" name="maxBmi" type="number" value={maxBmi} error={undefined} onChange={(value) => updateFilter("max", value)} min="0" step="any" hint="Inclusive upper bound" required={false} />
            <button className="secondary-button" type="button" onClick={() => { setMinBmi(""); setMaxBmi(""); setFilterError(""); }}>Clear filters</button>
          </div>
          {filterError && <p className="filter-alert" role="alert">{filterError}</p>}
          {!filterError && (
            <ParticipantTable
              participants={filteredParticipants}
              emptyMessage={hasActiveFilter ? "No participants match this BMI range." : "Participants will appear here when added."}
            />
          )}
          <p className="formula-note">BMI = weight (lb) ÷ height (in)² × 703</p>
        </section>

        <footer className="mt-6 flex flex-col gap-2 text-xs leading-5 text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>For pre-screening support only. BMI does not determine clinical eligibility.</span>
          <span>Measurements are entered in inches and pounds.</span>
        </footer>
      </main>
    </div>
  );
}

function FormField({
  label,
  name,
  type = "text",
  value,
  error,
  onChange,
  hint,
  required = true,
  ...inputProps
}: {
  label: string;
  name: string;
  type?: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
  hint?: string;
  required?: boolean;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "name" | "value" | "onChange" | "type" | "required">) {
  const hintId = hint ? `${name}-hint` : undefined;
  const errorId = error ? `${name}-error` : undefined;

  return (
    <div className="field-wrap">
      <label className="field-label" htmlFor={name}>{label}{required && <span aria-hidden="true" className="required-star"> *</span>}</label>
      <input
        {...inputProps}
        className={`field-input${error ? " field-input-error" : ""}`}
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        required={required}
      />
      {hint && <p className="field-hint" id={hintId}>{hint}</p>}
      {error && <p className="field-error" id={errorId} role="alert">{error}</p>}
    </div>
  );
}
