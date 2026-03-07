// beginning of LLM written Code, Model: Gemini
/** D is the domain type. P is the persistence type. */
export interface ReadMapper<D, P> {
  toDomain(persistence: P): D;
}

export interface WriteMapper<D, P> {
  toPersistence(domain: D): P;
}

export type Mapper<D, P> = ReadMapper<D, P> & WriteMapper<D, P>;
// end of LLM written Code
