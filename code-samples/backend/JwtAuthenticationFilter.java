package com.example.clinic.filter;

import com.example.clinic.services.JwtTokenService;
import com.example.clinic.services.UserDetailsServiceImpl;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Extracts a JWT from either the {@code Authorization: Bearer ...} header
 * (for non-browser clients) or the HTTP-only {@code AUTH-TOKEN} cookie
 * (for the browser SPA), validates it, and populates the SecurityContext.
 *
 * Invalid or absent tokens fall through silently — downstream filters and
 * {@code @PreAuthorize} checks decide the final outcome. This keeps the
 * filter simple and lets path-level rules permit unauthenticated access to
 * login endpoints.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String AUTH_COOKIE = "AUTH-TOKEN";
    private static final String BEARER_PREFIX = "Bearer ";

    @Autowired private UserDetailsServiceImpl userDetailsService;
    @Autowired private JwtTokenService jwtTokenService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String jwtToken = extractToken(request);
        String username = null;
        if (jwtToken != null) {
            try {
                username = jwtTokenService.getUsernameFromToken(jwtToken);
            } catch (Exception e) {
                logger.debug("Unable to read JWT subject: " + e.getMessage());
            }
        }

        if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            try {
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                if (jwtTokenService.validateToken(jwtToken, userDetails)) {
                    UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities());
                    auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            } catch (Exception e) {
                logger.debug("JWT validation failed: " + e.getMessage());
            }
        }

        filterChain.doFilter(request, response);
    }

    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith(BEARER_PREFIX)) {
            return header.substring(BEARER_PREFIX.length());
        }
        if (request.getCookies() != null) {
            for (Cookie c : request.getCookies()) {
                if (AUTH_COOKIE.equals(c.getName()) && c.getValue() != null && !c.getValue().isEmpty()) {
                    String v = c.getValue();
                    return v.startsWith(BEARER_PREFIX) ? v.substring(BEARER_PREFIX.length()) : v;
                }
            }
        }
        return null;
    }
}
