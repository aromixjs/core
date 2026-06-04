//@ts-nocheck
import { ax } from '@aromix/validator'

const schema = ax.pipe([preprocess, ax.string()])
