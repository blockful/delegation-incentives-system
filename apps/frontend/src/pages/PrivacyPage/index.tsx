import styled from 'styled-components'
import { tokens } from '@/styles'

export function PrivacyPage() {
  return (
    <Page>
      <Shell>
        <Header>
          <Eyebrow>Privacy</Eyebrow>
          <Title>Privacy-conscious analytics for the ENS Incentives Program</Title>
          <Intro>
            We use <a href="https://umami.is" target="_blank" rel="noopener noreferrer">Umami Cloud</a> to understand which pages and product flows are
            working, improve delegation reliability, and spot errors. Umami is
            cookieless, and we do not use analytics for ads, data sales, or
            cross-site tracking.
          </Intro>
        </Header>

        <Section>
          <SectionTitle>What we collect</SectionTitle>
          <List>
            <li>Page analytics such as page path, referrer, browser, device type, language, and country-level location.</li>
            <li>Product events such as delegate clicks, delegation success or error, and matchmaking flow steps.</li>
            <li>Public delegate addresses involved in delegation events, so we can measure delegate conversion and reliability.</li>
          </List>
        </Section>

        <Section>
          <SectionTitle>What we do not send to analytics</SectionTitle>
          <List>
            <li>Your connected wallet address.</li>
            <li>Your name, email, or contact details.</li>
            <li>Your matchmaking preferences associated with your wallet address.</li>
          </List>
        </Section>

        <Section>
          <SectionTitle>Why we use it</SectionTitle>
          <Body>
          We use analytics to understand how the product is used, 
          identify where users encounter problems, measure delegation reliability, and improve the overall experience. 
          We do not use analytics for advertising, selling data, or building marketing profiles.
          </Body>
        </Section>

        <Section>
          <SectionTitle>Questions</SectionTitle>
          <Body>
            For privacy questions or requests, contact{' '}
            <InlineLink href="mailto:contact@blockful.io">contact@blockful.io</InlineLink>.
          </Body>
        </Section>
      </Shell>
    </Page>
  )
}

const Page = styled.main`
  color: ${tokens.color.text};
`

const Shell = styled.div`
  width: min(100%, 880px);
  margin: 0 auto;
`

const Header = styled.header`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};
  margin-bottom: ${tokens.spacing['4xl']};
`

const Eyebrow = styled.p`
  margin: 0;
  color: ${tokens.color.blue};
  font-size: ${tokens.font.size.sm};
  font-weight: ${tokens.font.weight.bold};
  text-transform: uppercase;
`

const Title = styled.h1`
  margin: 0;
  color: ${tokens.color.darkBlue};
  font-size: ${tokens.font.size['4xl']};
  line-height: 1.08;
`

const Intro = styled.p`
  margin: 0;
  color: ${tokens.color.textSecondary};
  font-size: ${tokens.font.size.lg};
  line-height: 1.6;
`

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${tokens.spacing.md};
  padding: ${tokens.spacing['2xl']} 0;
  border-top: 1px solid ${tokens.color.border};
`

const SectionTitle = styled.h2`
  margin: 0;
  color: ${tokens.color.darkBlue};
  font-size: ${tokens.font.size['2xl']};
  line-height: 1.2;
`

const Body = styled.p`
  margin: 0;
  color: ${tokens.color.textSecondary};
  font-size: ${tokens.font.size.base};
  line-height: 1.7;
`

const List = styled.ul`
  margin: 0;
  padding-left: ${tokens.spacing.xl};
  color: ${tokens.color.textSecondary};
  font-size: ${tokens.font.size.base};
  line-height: 1.7;
`

const InlineLink = styled.a`
  color: ${tokens.color.blue};
  font-weight: ${tokens.font.weight.semibold};
`