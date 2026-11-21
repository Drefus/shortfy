export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class InvalidUrlError extends DomainError {}

export class InvalidSlugError extends DomainError {}
