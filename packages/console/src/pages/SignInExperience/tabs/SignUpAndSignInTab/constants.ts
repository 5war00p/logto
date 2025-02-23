import { SignUpIdentifier, SignInIdentifier, ConnectorType } from '@logto/schemas';

export const signUpIdentifiers = Object.values(SignUpIdentifier);

export const signInIdentifiers = Object.values(SignInIdentifier);

export const requiredVerifySignUpIdentifiers = [
  SignUpIdentifier.Email,
  SignUpIdentifier.Sms,
  SignUpIdentifier.EmailOrSms,
];

export const signUpToSignInIdentifierMapping: { [key in SignUpIdentifier]: SignInIdentifier[] } = {
  [SignUpIdentifier.Username]: [SignInIdentifier.Username],
  [SignUpIdentifier.Email]: [SignInIdentifier.Email],
  [SignUpIdentifier.Sms]: [SignInIdentifier.Sms],
  [SignUpIdentifier.EmailOrSms]: [SignInIdentifier.Email, SignInIdentifier.Sms],
  [SignUpIdentifier.None]: [],
};

export const signUpIdentifierToRequiredConnectorMapping: {
  [key in SignUpIdentifier]: ConnectorType[];
} = {
  [SignUpIdentifier.Username]: [],
  [SignUpIdentifier.Email]: [ConnectorType.Email],
  [SignUpIdentifier.Sms]: [ConnectorType.Sms],
  [SignUpIdentifier.EmailOrSms]: [ConnectorType.Email, ConnectorType.Sms],
  [SignUpIdentifier.None]: [],
};

export const signInIdentifierToRequiredConnectorMapping: {
  [key in SignInIdentifier]: ConnectorType[];
} = {
  [SignInIdentifier.Username]: [],
  [SignInIdentifier.Email]: [ConnectorType.Email],
  [SignInIdentifier.Sms]: [ConnectorType.Sms],
};
