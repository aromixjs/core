import { entity, kv, Storage } from "@aromix/core";

const schema = kv.object({
   id: kv.bigint().public(),
   createdAt: kv.date().defaultFn(() => new Date()).readable(),
   updatedAt: kv.date().defaultFn(() => new Date()).readable(),
   isActive: kv.boolean().default(true).public(),

   credentials: kv.object({
      email: kv.string().public(),
      password: kv.string().writable(),
      passwordHash: kv.string(),
      twoFactor: kv.object({
         enabled: kv.boolean().default(false).public(),
         secret: kv.string(),
         backupCodes: kv.array(kv.string().public()).readable(),
         lastUsedAt: kv.date().readable(),
      }).public(),
   }).public(),

   profile: kv.object({
      username: kv.string().default("anonymous").public(),
      displayName: kv.string().public(),
      bio: kv.string().default("").public(),
      avatarUrl: kv.string().public(),
      social: kv.object({
         twitter: kv.string().public(),
         github: kv.string().public(),
         links: kv.array(
            kv.object({
               label: kv.string().public(),
               url: kv.string().public(),
               icon: kv.string().public(),
            }).public()
         ).public(),
      }).public(),
   }).public(),

   settings: kv.object({
      theme: kv.string().default("system").public(),
      locale: kv.string().default("en").public(),
      timezone: kv.string().default("UTC").public(),
      notifications: kv.object({
         email: kv.boolean().default(true).public(),
         push: kv.boolean().default(false).public(),
         sms: kv.boolean().default(false).public(),
         digest: kv.object({
            enabled: kv.boolean().default(false).public(),
            frequency: kv.string().default("weekly").public(),
            channels: kv.array(kv.string().public()).public(),
         }).public(),
      }).public(),
      privacy: kv.object({
         profileVisible: kv.boolean().default(true).public(),
         showEmail: kv.boolean().default(false).public(),
         allowedIps: kv.array(kv.string().public()).readable(),
      }).public(),
   }).public(),

   billing: kv.object({
      customerId: kv.string().readable(),
      plan: kv.string().default("free").public(),
      seats: kv.number().default(1).public(),
      trialEndsAt: kv.date().readable(),
      paymentMethods: kv.array(
         kv.object({
            id: kv.string().public(),
            type: kv.string().public(),
            last4: kv.string().public(),
            expMonth: kv.number().public(),
            expYear: kv.number().public(),
            isDefault: kv.boolean().default(false).public(),
         }).public()
      ).readable(),
      invoices: kv.array(
         kv.object({
            id: kv.string().public(),
            amount: kv.number().public(),
            currency: kv.string().default("usd").public(),
            status: kv.string().public(),
            paidAt: kv.date().readable(),
            lineItems: kv.array(
               kv.object({
                  description: kv.string().public(),
                  quantity: kv.number().public(),
                  unitPrice: kv.number().public(),
               }).public()
            ).readable(),
         }).public()
      ).readable(),
   }).public(),

   roles: kv.array(
      kv.object({
         id: kv.bigint().public(),
         name: kv.string().public(),
         permissions: kv.array(
            kv.object({
               resource: kv.string().public(),
               actions: kv.array(kv.string().public()).public(),
               conditions: kv.object({
                  ownOnly: kv.boolean().default(false).public(),
                  fields: kv.array(kv.string().public()).public(),
               }).public(),
            }).public()
         ).public(),
      }).public()
   ).public(),

   audit: kv.array(
      kv.object({
         event: kv.string().readable(),
         ip: kv.string().readable(),
         userAgent: kv.string().readable(),
         at: kv.date().readable(),
         meta: kv.any().readable(),
      }).public()
   ).readable(),
}).public();




declare const kvStorage: Storage.KV

entity({
   name: 'test',
   storage: kvStorage,
   model: {
      base: schema,

      computed(data) {

      },
   }
})




