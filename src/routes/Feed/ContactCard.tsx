import styled from "@emotion/styled"
import React from "react"
import { FaTelegramPlane } from "react-icons/fa"
import { Emoji } from "src/components/Emoji"

const TELEGRAM_URL = "https://t.me/PRO_dgtldk"

const ContactCard: React.FC = () => {
  return (
    <>
      <StyledTitle>
        <Emoji>💬</Emoji> 联系我们
      </StyledTitle>
      <StyledWrapper>
        <a href={TELEGRAM_URL} rel="noreferrer" target="_blank">
          <FaTelegramPlane className="icon" />
          <div className="name">Telegram</div>
        </a>
      </StyledWrapper>
    </>
  )
}

export default ContactCard

const StyledTitle = styled.div`
  padding: 0.25rem;
  margin-bottom: 0.75rem;
`
const StyledWrapper = styled.div`
  display: flex;
  padding: 0.25rem;
  flex-direction: column;
  border-radius: 1rem;
  background-color: ${({ theme }) =>
    theme.scheme === "light" ? "white" : theme.colors.gray4};
  a {
    display: flex;
    padding: 0.75rem;
    gap: 0.75rem;
    align-items: center;
    border-radius: 1rem;
    color: ${({ theme }) => theme.colors.gray11};
    cursor: pointer;

    :hover {
      color: ${({ theme }) => theme.colors.gray12};
      background-color: ${({ theme }) => theme.colors.gray5};
    }
    .icon {
      font-size: 1.5rem;
      line-height: 2rem;
    }
    .name {
      font-size: 0.875rem;
      line-height: 1.25rem;
    }
  }
`
