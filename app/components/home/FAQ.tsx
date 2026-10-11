"use client"

import { ChevronDown, ChevronUp } from 'lucide-react';
import React, { useState } from 'react'

const FAQ = () => {

    const [openFaqIndex, setOpenFaqIndex] = useState(0);

    const faqs = [
        {
            question: 'Can I switch between monthly and annual billing?',
            answer: 'Yes, you can upgrade, downgrade, or switch your billing cycle at any time from your account settings. If you switch to annual, your savings will be applied immediately. Contact support if you need help with billing changes.',
        },
        {
            question: 'Is my data safe if I downgrade to the free plan after the trial?',
            answer: 'Your data is safe with us! If you downgrade to the free plan after your trial, your projects and data will be preserved. You can continue to access and export your data at any time. However, please note that if you exceed the limits of the free plan, you may need to upgrade again to restore full functionality.',
        },
        {
            question: 'Is my credit card information secure?',
            answer: 'Yes, we take security very seriously. We use Stripe for all payment processing, which is PCI DSS compliant and employs advanced security measures to protect your credit card information. Your payment details are encrypted and securely stored by Stripe, and we do not have access to your full credit card information. You can trust that your data is safe when you make a purchase with us.',
        },
        {
            question: 'What is your refund policy?',
            answer: 'We offer a 30-day money-back guarantee on all our plans. If you\'re not satisfied with your purchase, you can request a refund within 30 days of your initial payment. Please contact our support team for assistance with any refund requests.',
        },
        {
            question: 'Do you offer custom plans for large enterprises?',
            answer: 'Yes, we offer custom enterprise plans tailored to the specific needs of larger organizations. Our enterprise plans include additional features such as dedicated support, custom SLAs, and advanced security options. If you\'re interested in learning more about our enterprise offerings, please contact our sales team for a personalized consultation.',
        },
        {
            question: 'Are there any hidden fees for hosting?',
            answer: 'No! There are no hidden fees for hosting. Hosting is through Vercel (for now).Our pricing is transparent and all costs are clearly outlined on our pricing page. The price you see is the price you pay, with no additional charges for hosting or maintenance. If you have any questions about our pricing or what\'s included, please don\'t hesitate to reach out to our support team.',
        },
        {
            question: 'What payment methods do you accept?',
            answer: 'We accept all major credit cards, including Visa, MasterCard, American Express, and Discover. We also support payments through PayPal for added convenience. For enterprise customers, we can accommodate invoicing and bank transfers. If you have specific payment requirements or questions about billing, please contact our support team for assistance.',
        }
    ];

    return (
        <div id="faq" className="bg-white py-20 px-4 sm:px-6 lg:px-8 border-t border-slate-200">
            <div className="max-w-6xl mx-auto">
                <div className="text-center mb-20">
                    <h2 className="text-3xl font-bold text-slate-900 flex items-center justify-center gap-2 max-md:text-2xl">
                        Frequently Asked Questions
                    </h2>
                    <p className="mt-4 text-lg text-slate-600 max-md:text-base">
                        Got questions? We\'ve got answers. Here are some of our most commonly asked questions about our pricing plans and features. Further questions? Just reach out to our support team!
                    </p>
                </div>
                <div className="flex flex-row gap-15 mx-auto max-md:flex-col max-md:gap-10">
                    <div className="flex-1">
                        <img className="border-2 border-black/40" src="https://plus.unsplash.com/premium_photo-1678000616480-d4a041e6eba1?q=80&w=735&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="FAQ image" />
                    </div>
                    <div className="flex-1 space-y-4">
                        {faqs.map((faq, index) => (
                            <div
                                key={index}
                                className="border border-slate-200 rounded-sm overflow-hidden transition-all duration-200 hover:border-[#b8f36b]"
                            >
                                <button
                                    className="flex justify-between items-center w-full p-6 text-left bg-white focus:outline-none"
                                    onClick={() => setOpenFaqIndex(openFaqIndex === index ? -1 : index)}
                                >
                                    <span className="font-semibold text-slate-900">{faq.question}</span>
                                    {openFaqIndex === index ? (
                                        <ChevronUp className="h-5 w-5 text-[#b8f36b] shrink-0" />
                                    ) : (
                                        <ChevronDown className="h-5 w-5 text-slate-400 shrink-0" />
                                    )}
                                </button>

                                {/* Expandable Content */}
                                <div
                                    className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${openFaqIndex === index ? 'max-h-full pb-6 opacity-100' : 'max-h-0 opacity-0'
                                        }`}
                                >
                                    <p className="text-slate-600 leading-relaxed">
                                        {faq.answer}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    )
}

export default FAQ