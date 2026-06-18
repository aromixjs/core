import { Column } from './column'

export const lite = {
    int() {
        return new Column<number | null, number | null | undefined, number | null>('int')
    },
    real() {
        return new Column<number | null, number | null | undefined, number | null>('real')
    },
    text() {
        return new Column<string | null, string | null | undefined, string | null>('text')
    },
    blob() {
        return new Column<Uint8Array | null, Uint8Array | null | undefined, Uint8Array | null>('blob')
    },
}




