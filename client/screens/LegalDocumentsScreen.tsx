import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";

import { ThemedView } from "@/components/ThemedView";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

type DocumentType = "privacy" | "terms";

const LAST_UPDATED = "December 27, 2025";

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
  const [activeTab, setActiveTab] = useState<DocumentType>("privacy");

  const document = activeTab === "privacy" ? PRIVACY_POLICY : TERMS_OF_SERVICE;

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
            label="Privacy Policy"
            isSelected={activeTab === "privacy"}
            onPress={() => setActiveTab("privacy")}
          />
          <TabButton
            label="Terms of Service"
            isSelected={activeTab === "terms"}
            onPress={() => setActiveTab("terms")}
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
              name={activeTab === "privacy" ? "shield" : "file-text"}
              size={24}
              color={theme.primary}
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
