export interface AccessToken {
  token: string;
  tokenType: TokenType;
}

export enum TokenType {
  Authentication = 1,
  TwoFactorAuthentication = 2,
}
