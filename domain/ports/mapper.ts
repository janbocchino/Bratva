/** D, is the domain type. P, is the persistence type. */
export interface Mapper<D, P> {
  toDomain(persistence: P): D;
  toPersistence(domain: D): P;
}
