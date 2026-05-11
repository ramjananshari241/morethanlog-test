import React from "react"
import styled from "@emotion/styled"
import { CONFIG } from "site.config"

const d = new Date()
const y = d.getFullYear()
const from = +CONFIG.since

const FOOTER_LINK = "https://www.proplus.team/"

type Props = {
  className?: string
}

const Footer: React.FC<Props> = ({ className }) => {
  return (
    <StyledWrapper className={className}>
      <span className="year">
        © {from === y || !from ? y : `${from} - ${y}`}{" "}
      </span>
      <a href={FOOTER_LINK} target="_blank" rel="noreferrer">
        PRO+
      </a>
    </StyledWrapper>
  )
}

export default Footer

const StyledWrapper = styled.div`
  margin-top: 0.75rem;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.25rem;

  .year {
    font-size: 0.875rem;
    line-height: 1.25rem;
    color: ${({ theme }) => theme.colors.gray10};
  }

  a {
    font-size: 0.875rem;
    line-height: 1.25rem;
    color: ${({ theme }) => theme.colors.gray10};

    :hover {
      color: ${({ theme }) => theme.colors.gray12};
    }
  }
`
