// Mock citations for development
export const mockCitations = [
  {
    id: '1',
    title: 'Smith v. Jones, 123 F.3d 456 (9th Cir. 2020)',
    court: 'United States Court of Appeals for the Ninth Circuit',
    date: '2020-03-15',
    caseNumber: '19-12345',
    content: `SMITH v. JONES
United States Court of Appeals for the Ninth Circuit
123 F.3d 456 (2020)

OPINION

Before: JOHNSON, WILLIAMS, and DAVIS, Circuit Judges.

JOHNSON, Circuit Judge:

This case presents the question of whether the district court properly granted summary judgment on the plaintiff's breach of contract claim. We review de novo and AFFIRM.

I. BACKGROUND

Plaintiff John Smith entered into a written agreement with Defendant Mary Jones on January 15, 2019, for the purchase of commercial real estate located at 123 Main Street, San Francisco, California. The purchase price was $2.5 million, with a closing date set for March 1, 2019.

On February 25, 2019, Jones notified Smith that she was terminating the agreement, citing a provision that allowed either party to withdraw if certain financing conditions were not met. Smith filed suit, alleging breach of contract and seeking specific performance.

II. STANDARD OF REVIEW

We review a district court's grant of summary judgment de novo. Anderson v. Liberty Lobby, Inc., 477 U.S. 242, 247 (1986). Summary judgment is appropriate when "there is no genuine dispute as to any material fact and the movant is entitled to judgment as a matter of law." Fed. R. Civ. P. 56(a).

III. DISCUSSION

The central issue is whether the financing contingency clause in Section 5.2 of the agreement permitted Jones to terminate the contract. The relevant provision states:

"Either party may terminate this Agreement without penalty if the Buyer has not secured financing at an interest rate not to exceed 4.5% within 30 days of the execution of this Agreement."

Smith argues that this provision only applies to his inability to secure financing, not to Jones's decision to withdraw. However, the plain language of the contract states "either party," which unambiguously includes both the buyer and seller.

Under California law, "the words of a contract are to be understood in their ordinary and popular sense." Cal. Civ. Code § 1644. When contract language is clear and explicit, it governs. Bank of the West v. Superior Court, 2 Cal. 4th 1254, 1264 (1992).

IV. CONCLUSION

For the foregoing reasons, we AFFIRM the district court's grant of summary judgment in favor of Jones.

AFFIRMED.`
  },
  {
    id: '2',
    title: 'State v. Johnson, 789 P.2d 123 (Cal. 2019)',
    court: 'Supreme Court of California',
    date: '2019-06-20',
    caseNumber: 'S12345',
    content: `STATE v. JOHNSON
Supreme Court of California
789 P.2d 123 (2019)

CANTIL-SAKAUYE, C.J.

We granted review to determine whether Evidence Code section 1101 precludes the admission of evidence of uncharged acts of domestic violence in a prosecution for domestic violence under Penal Code section 273.5.

I. FACTUAL AND PROCEDURAL BACKGROUND

Defendant Robert Johnson was charged with inflicting corporal injury on a spouse (Pen. Code, § 273.5) after an incident on November 10, 2018, involving his wife, Sarah Johnson. The prosecution sought to introduce evidence of two prior uncharged incidents of domestic violence.

At trial, Sarah testified that on November 10, defendant struck her multiple times during an argument about finances. She suffered visible bruising and sought medical treatment. 

The prosecution also presented evidence of two prior incidents:
1. A 2016 incident where neighbors called police after hearing a disturbance
2. A 2017 incident where Sarah sought a temporary restraining order

The jury convicted defendant, and the Court of Appeal affirmed. We granted defendant's petition for review.

II. DISCUSSION

Evidence Code section 1109 provides an exception to the general prohibition against character evidence in criminal cases. It states:

"[I]n a criminal action in which the defendant is accused of an offense involving domestic violence, evidence of the defendant's commission of other domestic violence is not made inadmissible by Section 1101 if the evidence is not inadmissible pursuant to Section 352."

The Legislature enacted section 1109 recognizing that domestic violence is a quintessential recidivist crime. People v. Brown, 77 Cal. App. 4th 1324, 1332 (2000).

III. DISPOSITION

The judgment of the Court of Appeal is affirmed.

WE CONCUR: CORRIGAN, J., LIU, J., CUÉLLAR, J., KRUGER, J., GROBAN, J., JENKINS, J.`
  },
  {
    id: '3',
    title: 'In re Estate of Williams, 456 N.E.2d 789 (Ill. App. 2021)',
    court: 'Illinois Appellate Court, First District',
    date: '2021-02-10',
    caseNumber: '1-20-1234',
    content: `IN RE ESTATE OF WILLIAMS
Illinois Appellate Court, First District
456 N.E.2d 789 (2021)

JUSTICE HOFFMAN delivered the judgment of the court, with opinion.
Justices Cunningham and Rochford concurred in the judgment and opinion.

OPINION

¶ 1 This appeal concerns the validity of a holographic will executed by decedent Margaret Williams on July 1, 2020, approximately one month before her death. The circuit court of Cook County admitted the will to probate over the objection of decedent's son, Thomas Williams, who claimed the will was procured through undue influence. We reverse.

¶ 2 I. BACKGROUND

¶ 3 Margaret Williams died on August 5, 2020, at age 82. She was survived by two children: Thomas Williams and Jennifer Smith. On July 1, 2020, Margaret executed a holographic will leaving her entire estate, valued at approximately $3.2 million, to Jennifer. The will specifically disinherited Thomas.

¶ 4 Thomas filed a petition challenging the will, alleging that Jennifer exercised undue influence over their mother. Following a bench trial, the circuit court found that Thomas failed to prove undue influence and admitted the will to probate.

¶ 5 II. ANALYSIS

¶ 6 To establish undue influence, the objector must show that the beneficiary had a fiduciary relationship with the testator, the beneficiary was active in procuring the will, and the beneficiary received a substantial benefit under the will. In re Estate of Henke, 203 Ill. App. 3d 975, 980 (1990).

¶ 7 The evidence at trial established:
1. Jennifer served as Margaret's primary caregiver for the last two years of her life
2. Jennifer accompanied Margaret to the attorney who drafted the will
3. Jennifer received the entire estate, while Thomas received nothing

¶ 8 Where a fiduciary relationship exists and the fiduciary benefits from the transaction, a presumption of undue influence arises. The burden then shifts to the proponent to prove the absence of undue influence by clear and convincing evidence.

¶ 9 III. CONCLUSION

¶ 10 We find that the circuit court erred in concluding that no presumption of undue influence arose. The judgment is reversed, and the cause is remanded for further proceedings consistent with this opinion.

¶ 11 Reversed and remanded.`
  }
];

// Function to get a random mock citation
export function getRandomMockCitation() {
  const randomIndex = Math.floor(Math.random() * mockCitations.length);
  return mockCitations[randomIndex];
}