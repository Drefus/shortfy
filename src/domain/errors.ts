export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidUrlError extends DomainError {}

export class InvalidAliasError extends DomainError {}

export class InvalidExpirationError extends DomainError {}

/** Não foi possível gerar um código livre após o número máximo de tentativas. */
export class CodeGenerationError extends DomainError {
  constructor(readonly attempts: number) {
    super(`Não foi possível gerar um código único após ${attempts} tentativas.`);
  }
}

export class AliasTakenError extends DomainError {
  constructor(readonly alias: string) {
    super(`O alias "${alias}" já está em uso.`);
  }
}

export class LinkNotFoundError extends DomainError {
  constructor(readonly code: string) {
    super(`Nenhum link encontrado para o código "${code}".`);
  }
}

export class LinkExpiredError extends DomainError {
  constructor(readonly code: string) {
    super(`O link "${code}" expirou.`);
  }
}
