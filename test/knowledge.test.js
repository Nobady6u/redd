"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const {knowledgeReply}=require("../knowledge");

test("matches an Arabic FAQ with enough shared keywords",()=>{
 const kb="سؤال: ما هي ساعات العمل لديكم؟\nجواب: نعمل من التاسعة صباحاً حتى العاشرة مساءً.";
 assert.equal(knowledgeReply("متى ساعات العمل عندكم؟",kb),"نعمل من التاسعة صباحاً حتى العاشرة مساءً.");
});
test("does not guess when the question is unrelated",()=>{
 const kb="سؤال: ما هي ساعات العمل لديكم؟\nجواب: نعمل من التاسعة صباحاً.";
 assert.equal(knowledgeReply("هل توفرون خدمة التوصيل؟",kb),null);
});
test("does not answer from an incomplete FAQ entry",()=>{
 const kb="سؤال: ما هي ساعات العمل لديكم؟";
 assert.equal(knowledgeReply("متى ساعات العمل عندكم؟",kb),null);
});
test("returns null for empty or malformed knowledge",()=>{
 assert.equal(knowledgeReply("ساعات العمل", ""),null);
 assert.equal(knowledgeReply("ساعات العمل", "دوامنا يومياً"),null);
});
test("avoids ambiguous matches between similarly ranked FAQs",()=>{
 const kb=[
  "سؤال: ما هي أسعار التوصيل للمنطقة؟",
  "جواب: التوصيل بعشرة.",
  "سؤال: ما هي أسعار التوصيل للمدينة؟",
  "جواب: التوصيل بخمسة."
 ].join("\n");
 assert.equal(knowledgeReply("ما أسعار التوصيل؟",kb),null);
});
