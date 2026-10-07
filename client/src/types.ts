export type ParticipantInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  heightInches: number;
  weightPounds: number;
};

export type Participant = ParticipantInput & {
  id: string;
  bmi: number;
  createdAt: string;
};

export type FieldErrors = Partial<Record<keyof ParticipantInput | "_form", string>>;
