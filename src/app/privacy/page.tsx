import { SiteHeader } from "@/components/site-header";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - CharacterFits",
  description: "Privacy Policy for CharacterFits character costume and cosplay outfit builder.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <SiteHeader />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>

        <div className="bg-white rounded-lg shadow-sm p-8 space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Information We Collect</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We collect information that you provide directly to us, including:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Account information (name, email address) when you create an account</li>
              <li>Content you create, such as outfit collections and preferences</li>
              <li>Communications you send to us</li>
              <li>Usage data and analytics about how you interact with our Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. How We Use Your Information</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Provide, maintain, and improve our Service</li>
              <li>Create and manage your account</li>
              <li>Send you technical notices and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Analyze usage patterns and trends</li>
              <li>Detect, prevent, and address technical issues and fraudulent activity</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Third-Party Services</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We use the following third-party services that may collect information:
            </p>

            <div className="space-y-4 ml-4">
              <div>
                <h3 className="font-semibold text-gray-900">Clerk Authentication</h3>
                <p className="text-gray-700 text-sm">
                  We use Clerk for user authentication and account management. Clerk may collect and process your account information. View Clerk's Privacy Policy at{" "}
                  <a href="https://clerk.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    clerk.com/privacy
                  </a>
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900">Google Cloud Platform</h3>
                <p className="text-gray-700 text-sm">
                  We use Google Cloud services for storage and infrastructure. View Google's Privacy Policy at{" "}
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    policies.google.com/privacy
                  </a>
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900">Amazon Associates</h3>
                <p className="text-gray-700 text-sm">
                  Our Service includes affiliate links to Amazon.com. When you click these links, Amazon may collect information about your visit. View Amazon's Privacy Policy at{" "}
                  <a href="https://www.amazon.com/gp/help/customer/display.html?nodeId=GX7NJQ4ZB8MHFRNJ" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    amazon.com/privacy
                  </a>
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Cookies and Tracking Technologies</h2>
            <p className="text-gray-700 leading-relaxed">
              We use cookies and similar tracking technologies to collect information about your browsing activities. Cookies are small data files stored on your device. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Data Security</h2>
            <p className="text-gray-700 leading-relaxed">
              We take reasonable measures to help protect information about you from loss, theft, misuse, unauthorized access, disclosure, alteration, and destruction. However, no internet or email transmission is ever fully secure or error-free. Please keep this in mind when disclosing any information to us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Your Rights and Choices</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Depending on your location, you may have certain rights regarding your personal information:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>Access:</strong> You can request access to the personal information we hold about you</li>
              <li><strong>Correction:</strong> You can request that we correct inaccurate information</li>
              <li><strong>Deletion:</strong> You can request that we delete your personal information</li>
              <li><strong>Data Portability:</strong> You can request a copy of your data in a structured format</li>
              <li><strong>Opt-Out:</strong> You can opt out of certain data processing activities</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              To exercise these rights, please contact us through our website.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Data Retention</h2>
            <p className="text-gray-700 leading-relaxed">
              We retain your personal information for as long as necessary to provide our Service and for legitimate business purposes, such as maintaining performance, making data-driven decisions, complying with legal obligations, and resolving disputes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Children's Privacy</h2>
            <p className="text-gray-700 leading-relaxed">
              Our Service is not directed to children under the age of 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us so we can delete such information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. International Data Transfers</h2>
            <p className="text-gray-700 leading-relaxed">
              Your information may be transferred to and maintained on computers located outside of your state, province, country, or other governmental jurisdiction where data protection laws may differ. By using our Service, you consent to this transfer.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Changes to This Privacy Policy</h2>
            <p className="text-gray-700 leading-relaxed">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date below. You are advised to review this Privacy Policy periodically for any changes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Contact Us</h2>
            <p className="text-gray-700 leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us through our website.
            </p>
          </section>

          <div className="mt-8 pt-8 border-t border-gray-200 text-sm text-gray-600">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </main>
    </div>
  );
}
