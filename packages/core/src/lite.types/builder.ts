import { BlobModifier } from "../lite.column/blob"
import { IntModifier } from "../lite.column/int"
import { RealModifier } from "../lite.column/real"
import { TextModifier } from "../lite.column/text"

export interface Builder {
	text<const Col extends string>(col: Col): TextModifier<Col>
	int<const Col extends string>(col: Col): IntModifier<Col>
	real<const Col extends string>(col: Col): RealModifier<Col>
	blob<const Col extends string>(col: Col): BlobModifier<Col>
}