import Link from "next/link"
import { CONFIG } from "site.config"
import styled from "@emotion/styled"

const Logo = () => {
  return (
    <StyledWrapper href="/" aria-label={CONFIG.blog.title}>
      {CONFIG.blog.title}
    </StyledWrapper>
  )
}

export default Logo

const StyledWrapper = styled(Link)`
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.2px;
  color: ${({ theme }) => theme.colors.gray12};
  text-decoration: none;

  &:hover {
    text-decoration: none;
    opacity: 0.9;
  }
`
