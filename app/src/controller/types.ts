import { Request } from "../utils";

export interface RegistrationRequest extends Request {
  body: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword?: string;
    remember?: boolean;
  };
}
export interface LoginRequest extends Request {
  body: {
    email: string;
    password: string;
    remember?: boolean;
  };
}
