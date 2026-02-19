import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

type DocumentType = "privacy" | "terms" | "liability";

const LAST_UPDATED = "February 19, 2026";

const PRIVACY_POLICY = {
  title: "Privacy Policy",
  sections: [
    {
      heading: "Introduction",
      content: `ServiceMe ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and related services (collectively, the "Service").

By using ServiceMe, you agree to the collection and use of information in accordance with this policy. If you do not agree with the terms of this Privacy Policy, please do not access the Service.`
    },
    {
      heading: "Information We Collect",
      content: `We collect several types of information for various purposes to provide and improve our Service:

Personal Information:
- Name, email address, and phone number
- Profile photo (optional)
- Payment and billing information
- Vehicle information (make, model, year, license plate)

Location Data:
- Real-time GPS location when you request roadside assistance
- Location is shared with service providers to facilitate service delivery
- Location tracking ends after your service request is completed

Device Information:
- Device type, operating system, and unique device identifiers
- Mobile network information
- App usage statistics and crash reports

Service Information:
- Service request history
- Communications with service providers
- Ratings and reviews you provide`
    },
    {
      heading: "How We Use Your Information",
      content: `We use the collected information for various purposes:

Service Delivery:
- To connect you with nearby roadside assistance providers
- To process and fulfill your service requests
- To calculate accurate arrival times and distances
- To facilitate communication between you and service providers

Payment Processing:
- To process payments for services rendered
- To manage billing and subscription information
- To prevent fraudulent transactions

Service Improvement:
- To analyze usage patterns and improve our app
- To develop new features and services
- To personalize your experience

Communications:
- To send service updates and notifications
- To respond to your inquiries and support requests
- To send promotional communications (with your consent)`
    },
    {
      heading: "Information Sharing",
      content: `We may share your information in the following situations:

With Service Providers:
- Your location and contact information are shared with assigned service providers to complete your service request
- Vehicle information is shared to ensure providers bring appropriate equipment

Third-Party Service Providers:
- Payment processors to handle transactions securely
- Analytics providers to help us understand app usage
- Cloud storage providers for data hosting
- Map services for location and navigation features

Legal Requirements:
- When required by law or legal process
- To protect our rights, privacy, safety, or property
- To investigate potential violations of our terms

Business Transfers:
- In connection with any merger, acquisition, or sale of company assets`
    },
    {
      heading: "Data Security",
      content: `We implement appropriate technical and organizational security measures to protect your personal information:

- Encryption of data in transit and at rest
- Secure authentication mechanisms
- Regular security assessments and updates
- Access controls limiting data access to authorized personnel

However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.`
    },
    {
      heading: "Data Retention",
      content: `We retain your personal information for as long as necessary to:

- Provide you with our services
- Comply with legal obligations
- Resolve disputes and enforce our agreements
- Maintain business records as required by law

Service request history is retained for up to 3 years for quality assurance and dispute resolution purposes. You may request deletion of your account and associated data at any time.`
    },
    {
      heading: "Your Rights",
      content: `Depending on your location, you may have certain rights regarding your personal information:

Access: Request a copy of the personal information we hold about you

Correction: Request correction of inaccurate or incomplete information

Deletion: Request deletion of your personal information, subject to legal requirements

Portability: Request a copy of your data in a portable format

Opt-Out: Opt out of marketing communications at any time

Withdraw Consent: Withdraw consent where processing is based on consent

To exercise these rights, please contact us at privacy@serviceme.app`
    },
    {
      heading: "Children's Privacy",
      content: `Our Service is not intended for use by children under the age of 18. We do not knowingly collect personal information from children under 18. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately. If we discover we have collected personal information from a child under 18, we will take steps to delete that information.`
    },
    {
      heading: "Changes to This Policy",
      content: `We may update our Privacy Policy from time to time. We will notify you of any changes by:

- Posting the new Privacy Policy on this page
- Updating the "Last Updated" date
- Sending you an email notification for significant changes

We encourage you to review this Privacy Policy periodically for any changes. Changes are effective when they are posted on this page.`
    },
    {
      heading: "Contact Us",
      content: `If you have any questions about this Privacy Policy, please contact us:

Email: privacy@serviceme.app
Address: ServiceMe Inc.
123 Roadside Way
San Francisco, CA 94102
United States

For data protection inquiries in the EU, please contact our Data Protection Officer at dpo@serviceme.app`
    }
  ]
};

const TERMS_OF_SERVICE = {
  title: "Terms of Service",
  sections: [
    {
      heading: "Agreement to Terms",
      content: `Welcome to ServiceMe. These Terms of Service ("Terms") govern your access to and use of the ServiceMe mobile application and related services (collectively, the "Service") operated by ServiceMe Inc. ("Company," "we," "us," or "our").

By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of these Terms, you may not access the Service.

You must be at least 18 years old to use this Service. By using ServiceMe, you represent and warrant that you are at least 18 years of age.`
    },
    {
      heading: "Description of Service",
      content: `ServiceMe is an on-demand roadside assistance platform that connects drivers in need of help with nearby service providers. Our services include, but are not limited to:

- Flat tire assistance and tire changes
- Jump start services for dead batteries
- Vehicle towing services
- Emergency fuel delivery
- Lockout assistance

ServiceMe acts as a platform connecting users with independent service providers. We do not directly provide roadside assistance services. Service providers are independent contractors, not employees of ServiceMe.`
    },
    {
      heading: "User Accounts",
      content: `To use certain features of the Service, you must create an account. When you create an account, you agree to:

- Provide accurate, current, and complete information
- Maintain and promptly update your account information
- Maintain the security of your password and account
- Accept responsibility for all activities that occur under your account
- Notify us immediately of any unauthorized use of your account

We reserve the right to suspend or terminate accounts that violate these Terms or contain false information.`
    },
    {
      heading: "User Responsibilities",
      content: `As a user of ServiceMe, you agree to:

- Use the Service only for lawful purposes
- Provide accurate information about your location and vehicle
- Be present and accessible when a service provider arrives
- Treat service providers with respect and courtesy
- Pay all applicable fees for services rendered
- Provide accurate payment information

You agree NOT to:
- Use the Service for any illegal or unauthorized purpose
- Submit false or misleading service requests
- Harass, abuse, or harm service providers
- Interfere with the proper working of the Service
- Attempt to access accounts or systems without authorization
- Use the Service to compete with or create a similar service`
    },
    {
      heading: "Service Providers",
      content: `Service providers on our platform are independent contractors, not employees of ServiceMe. We screen service providers and verify their credentials, but we do not guarantee:

- The quality or safety of any service provided
- The accuracy of service provider information or ratings
- The availability of service providers in your area
- That any specific service provider will accept your request

Service providers are responsible for:
- Maintaining appropriate licenses and insurance
- Providing services in a professional manner
- Complying with all applicable laws and regulations`
    },
    {
      heading: "Pricing and Payment",
      content: `Service Pricing:
- Prices for services are displayed before you confirm a request
- Prices may vary based on location, time, and service type
- Additional charges may apply for special circumstances

Payment Terms:
- Payment is processed after service completion
- We accept major credit cards and digital payment methods
- All fees are non-refundable except as stated in our Refund Policy
- You authorize us to charge your payment method for all services

Premium Membership:
- Premium members receive discounted rates and priority service
- Membership fees are billed monthly and auto-renew
- You may cancel your membership at any time`
    },
    {
      heading: "Cancellation and Refund Policy",
      content: `Cancellation by User:
- You may cancel a service request before a provider is assigned at no charge
- Cancellation after provider assignment may result in a cancellation fee
- No-show situations may result in a service fee

Cancellation by Provider:
- If a provider cancels, we will attempt to find an alternative provider
- If no alternative is available, you will receive a full refund

Refunds:
- Refund requests must be submitted within 48 hours of service
- Refunds are processed within 5-10 business days
- Refund decisions are made on a case-by-case basis`
    },
    {
      heading: "Limitation of Liability",
      content: `TO THE MAXIMUM EXTENT PERMITTED BY LAW:

ServiceMe provides the Service on an "AS IS" and "AS AVAILABLE" basis. We make no warranties, express or implied, regarding:
- The reliability or availability of the Service
- The quality of services provided by service providers
- The accuracy of information on the platform
- That the Service will meet your specific requirements

IN NO EVENT SHALL SERVICEME BE LIABLE FOR:
- Any indirect, incidental, special, or consequential damages
- Loss of profits, data, or business opportunities
- Damages exceeding the amount paid for services in the past 12 months
- Claims arising from the actions of service providers

Some jurisdictions do not allow limitations on implied warranties or exclusion of certain damages, so these limitations may not apply to you.`
    },
    {
      heading: "Indemnification",
      content: `You agree to defend, indemnify, and hold harmless ServiceMe, its officers, directors, employees, and agents from any claims, damages, obligations, losses, liabilities, costs, or debt arising from:

- Your use of the Service
- Your violation of these Terms
- Your violation of any third-party rights
- Your interactions with service providers
- Any content you submit to the Service`
    },
    {
      heading: "Intellectual Property",
      content: `The Service and its original content, features, and functionality are owned by ServiceMe and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.

You may not:
- Copy, modify, or distribute the Service or its content
- Use our trademarks or branding without permission
- Reverse engineer or attempt to extract source code
- Create derivative works based on the Service

User Content:
- You retain ownership of content you submit
- You grant us a license to use, display, and distribute your content
- You are responsible for ensuring you have rights to content you submit`
    },
    {
      heading: "Dispute Resolution",
      content: `Informal Resolution:
Before filing any legal claim, you agree to attempt to resolve disputes informally by contacting us at legal@serviceme.app

Arbitration:
Any disputes not resolved informally shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association. Arbitration shall take place in San Francisco, California.

Class Action Waiver:
You agree that disputes will be resolved on an individual basis and waive any right to participate in a class action lawsuit or class-wide arbitration.

Governing Law:
These Terms shall be governed by the laws of the State of California, without regard to its conflict of law provisions.`
    },
    {
      heading: "Termination",
      content: `We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including:

- Violation of these Terms
- Fraudulent or illegal activity
- Abusive behavior toward service providers
- Non-payment for services

Upon termination:
- Your right to use the Service will immediately cease
- We may delete your account and associated data
- Provisions that by their nature should survive termination shall survive`
    },
    {
      heading: "Changes to Terms",
      content: `We reserve the right to modify or replace these Terms at any time. Material changes will be communicated through:

- In-app notifications
- Email to your registered address
- Posting on our website

Your continued use of the Service after changes constitutes acceptance of the new Terms. If you do not agree to the new terms, you must stop using the Service.`
    },
    {
      heading: "Contact Information",
      content: `If you have any questions about these Terms, please contact us:

Email: legal@serviceme.app
Address: ServiceMe Inc.
123 Roadside Way
San Francisco, CA 94102
United States

Phone: 1-800-SERVICE (1-800-737-8423)
Hours: 24/7 Support Available`
    }
  ]
};

const LIABILITY_DISCLAIMER = {
  title: "Liability Disclaimer",
  sections: [
    {
      heading: "Purpose of This Disclaimer",
      content: `This Liability Disclaimer ("Disclaimer") applies to all users of the ServiceMe platform, including both Customers (drivers requesting roadside assistance) and Service Providers (individuals and businesses offering roadside assistance services).

By using ServiceMe, you acknowledge that you have read, understood, and agree to the terms outlined in this Disclaimer. If you do not agree, you must discontinue use of the platform immediately.`
    },
    {
      heading: "Platform Role",
      content: `ServiceMe operates solely as a technology platform that connects Customers with independent Service Providers. ServiceMe does not provide roadside assistance services directly. We are not a roadside assistance company, towing company, or automotive repair shop.

ServiceMe is not responsible for:
- The quality, safety, or legality of services performed
- The qualifications or competence of Service Providers
- The condition or suitability of equipment or tools used
- The outcome or result of any roadside assistance service
- Any damage to vehicles, property, or persons during service delivery`
    },
    {
      heading: "For Customers (Drivers)",
      content: `By requesting roadside assistance through ServiceMe, you acknowledge and agree to the following:

Assumption of Risk:
- Roadside assistance involves inherent risks, including but not limited to vehicle damage, personal injury, and property damage
- You voluntarily assume all risks associated with receiving roadside assistance services
- You understand that ServiceMe has no control over the actions or quality of work performed by Service Providers

Vehicle and Property:
- You are responsible for ensuring your vehicle is in a safe location before requesting service
- You acknowledge that minor cosmetic or mechanical damage may occur during towing, tire changes, jump starts, or other services
- ServiceMe is not liable for any pre-existing conditions or damage to your vehicle
- You should remove all valuables from your vehicle before any tow service

Personal Safety:
- You are responsible for your own safety and the safety of your passengers while awaiting service
- You should remain in a safe location, away from traffic, until your Service Provider arrives
- You should verify the identity of your Service Provider before allowing them to work on your vehicle

Service Expectations:
- ServiceMe does not guarantee response times, availability, or service outcomes
- Estimated arrival times are approximations and may vary based on traffic, weather, and other factors
- Service Providers may decline or be unable to complete a service request for any reason
- You are responsible for verifying that the service performed meets your expectations before confirming completion`
    },
    {
      heading: "For Service Providers",
      content: `By offering roadside assistance services through ServiceMe, you acknowledge and agree to the following:

Independent Contractor Status:
- You are an independent contractor, not an employee of ServiceMe
- You are solely responsible for your own actions, conduct, and the quality of services you provide
- You are responsible for maintaining your own insurance, licenses, and certifications as required by applicable law

Liability and Insurance:
- You assume full liability for any injury, damage, or loss that occurs as a result of your services
- You are required to maintain adequate general liability insurance at all times while providing services
- You agree to indemnify and hold ServiceMe harmless from any claims, damages, or losses arising from your services
- Commercial auto insurance is strongly recommended for providers using personal vehicles

Safety and Compliance:
- You are responsible for assessing road conditions and ensuring it is safe to perform the requested service
- You must comply with all applicable traffic laws, safety regulations, and industry standards
- You must use appropriate personal protective equipment and follow proper safety procedures
- You should decline any service request that you determine to be unsafe or beyond your capabilities

Duty of Care:
- You agree to exercise reasonable care and skill when performing services
- You must not perform services for which you are not qualified or adequately equipped
- You must clearly communicate any limitations or concerns to the Customer before beginning work
- You are responsible for properly securing vehicles during towing and transport`
    },
    {
      heading: "Limitation of Liability",
      content: `TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW:

ServiceMe, its affiliates, officers, directors, employees, agents, and licensors shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages, including but not limited to:

- Personal injury or death arising from roadside assistance services
- Damage to vehicles, property, or equipment during or after service
- Loss of income, profits, or business opportunities
- Emotional distress or inconvenience
- Data loss or security breaches
- Any damages exceeding the service fee paid for the specific transaction giving rise to the claim

ServiceMe's total aggregate liability to any user for all claims arising from or related to the use of the platform shall not exceed the greater of (a) the total fees paid by the user to ServiceMe in the twelve (12) months preceding the claim, or (b) one hundred dollars ($100).`
    },
    {
      heading: "Mutual Waiver of Claims",
      content: `Both Customers and Service Providers agree to:

- Waive any right to bring class action claims against ServiceMe
- Resolve all disputes through the arbitration process outlined in our Terms of Service
- Release ServiceMe from any claims arising from interactions between Customers and Service Providers
- Acknowledge that ServiceMe's role is limited to facilitating connections between parties

This waiver does not apply to claims that cannot be waived under applicable law, including claims for gross negligence or willful misconduct by ServiceMe.`
    },
    {
      heading: "Insurance Recommendations",
      content: `ServiceMe strongly recommends the following insurance coverage:

For Customers:
- Comprehensive auto insurance that covers roadside incidents
- Personal property insurance for valuables left in vehicles
- Consider adding roadside assistance coverage to your existing auto policy as a supplement

For Service Providers:
- General liability insurance (minimum $1,000,000 per occurrence recommended)
- Commercial auto insurance if using a personal vehicle for service calls
- Professional liability (errors and omissions) insurance
- Workers' compensation insurance if employing helpers or assistants
- Garagekeepers liability insurance for providers handling customer vehicles

ServiceMe does not provide insurance coverage to Customers or Service Providers. Each party is responsible for obtaining and maintaining their own insurance coverage.`
    },
    {
      heading: "Reporting Incidents",
      content: `In the event of any injury, damage, or dispute during a service interaction:

Immediate Steps:
- Ensure the safety of all parties involved
- Call emergency services (911) if there is any injury or immediate danger
- Document the incident with photos and written notes
- Exchange insurance information with the other party

Reporting to ServiceMe:
- Report the incident through the app using the "Report a Problem" feature
- Contact our support team at safety@serviceme.app
- Provide all relevant details, photos, and documentation
- Cooperate fully with any investigation

ServiceMe may assist in facilitating communication between parties but is not responsible for resolving disputes or mediating claims between Customers and Service Providers.`
    },
    {
      heading: "Acknowledgment",
      content: `By using ServiceMe as either a Customer or Service Provider, you confirm that:

- You have read and understood this Liability Disclaimer in its entirety
- You voluntarily agree to all terms and conditions stated herein
- You understand that roadside assistance services carry inherent risks
- You acknowledge that ServiceMe is a platform facilitator, not a service provider
- You agree to maintain appropriate insurance coverage for your role
- You understand that this Disclaimer supplements the Terms of Service and Privacy Policy

This Disclaimer is effective as of your first use of the ServiceMe platform and remains in effect for the duration of your use of the platform and any services obtained or provided through it.

For questions about this Disclaimer, contact: legal@serviceme.app`
    }
  ]
};

function TabButton({
  label,
  isSelected,
  onPress,
}: {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tabButton,
        {
          backgroundColor: isSelected ? theme.primary : "transparent",
          borderColor: isSelected ? theme.primary : theme.border,
        },
      ]}
    >
      <ThemedText
        type="body"
        style={{
          color: isSelected ? "#FFFFFF" : theme.textSecondary,
          fontWeight: isSelected ? "600" : "400",
        }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

function DocumentSection({ heading, content }: { heading: string; content: string }) {
  const { theme } = useTheme();

  return (
    <View style={styles.section}>
      <ThemedText type="h4" style={styles.sectionHeading}>
        {heading}
      </ThemedText>
      <ThemedText
        type="body"
        style={[styles.sectionContent, { color: theme.textSecondary }]}
      >
        {content}
      </ThemedText>
    </View>
  );
}

export default function LegalDocumentsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();
  const route = useRoute<RouteProp<RootStackParamList, "LegalDocuments">>();
  const [activeTab, setActiveTab] = useState<DocumentType>(route.params?.initialTab || "privacy");

  const document = activeTab === "privacy" ? PRIVACY_POLICY : activeTab === "terms" ? TERMS_OF_SERVICE : LIABILITY_DISCLAIMER;

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.tabContainer}>
          <TabButton
            label="Privacy"
            isSelected={activeTab === "privacy"}
            onPress={() => setActiveTab("privacy")}
          />
          <TabButton
            label="Terms"
            isSelected={activeTab === "terms"}
            onPress={() => setActiveTab("terms")}
          />
          <TabButton
            label="Disclaimer"
            isSelected={activeTab === "liability"}
            onPress={() => setActiveTab("liability")}
          />
        </View>

        <View
          style={[
            styles.documentContainer,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.documentHeader}>
            <Feather
              name={activeTab === "privacy" ? "shield" : activeTab === "terms" ? "file-text" : "alert-triangle"}
              size={24}
              color={activeTab === "liability" ? "#F59E0B" : theme.primary}
            />
            <ThemedText type="h3" style={{ marginLeft: Spacing.md }}>
              {document.title}
            </ThemedText>
          </View>

          <ThemedText
            type="small"
            style={[styles.lastUpdated, { color: theme.textSecondary }]}
          >
            Last Updated: {LAST_UPDATED}
          </ThemedText>

          {document.sections.map((section, index) => (
            <DocumentSection
              key={index}
              heading={section.heading}
              content={section.content}
            />
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
  },
  tabContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  tabButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: "center",
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  documentContainer: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  documentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  lastUpdated: {
    marginBottom: Spacing.xl,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeading: {
    marginBottom: Spacing.sm,
  },
  sectionContent: {
    lineHeight: 22,
  },
});
