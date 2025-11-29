export interface CredoInit {
  status: number,
  message: string,
  data: {
    authorizationUrl: string;
    reference: string;
    credoReference: string;
  },
  execTime: number,
  error: []
}