import { Schema } from "./schema"

namespace User { }

export const ax = {
	string() {
		return new Schema<{
			base: string,
			select: string,
			insert: string,
			update: string
		}>('string')
	},
	number() {
		return new Schema<{
			base: number,
			select: number,
			insert: number,
			update: number
		}>('number')
	},
	boolean() {
		return new Schema<{
			base: boolean,
			select: boolean,
			insert: boolean,
			update: boolean
		}>('boolean')
	},
	bigint() {
		return new Schema<{
			base: bigint,
			select: bigint,
			insert: bigint,
			update: bigint
		}>('bigint')
	},
	symbol() {
		return new Schema<{
			base: symbol,
			select: symbol,
			insert: symbol,
			update: symbol
		}>('symbol')
	},
	null() {
		return new Schema<{
			base: null,
			select: null,
			insert: null,
			update: null
		}>('null')
	},
	undefined() {
		return new Schema<{
			base: undefined,
			select: undefined,
			insert: undefined,
			update: undefined
		}>('undefined')
	},
	unknown() {
		return new Schema<{
			base: unknown,
			select: unknown,
			insert: unknown,
			update: unknown
		}>('unknown')
	},
	never() {
		return new Schema<{
			base: never,
			select: never,
			insert: never,
			update: never
		}>('never')
	}

}

const data = ax.string().convert().readonly('test').access({
	insert: ax.string()
})