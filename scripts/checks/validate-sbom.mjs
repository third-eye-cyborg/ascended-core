#!/usr/bin/env node
/**
 * SPDX 2.3 SBOM validator for Ascended Core.
 *
 * Validates a JSON SBOM file against the structural and semantic requirements
 * of the SPDX 2.3 specification (https://spdx.github.io/spdx-spec/v2.3/).
 *
 * Checks performed:
 *   - All required top-level fields (spdxVersion, dataLicense, SPDXID, name,
 *     documentNamespace, creationInfo, packages, relationships)
 *   - documentNamespace is an absolute URI (https://, http://, or urn:)
 *   - creationInfo.created is a well-formed ISO 8601 UTC datetime (Z suffix)
 *     and not implausibly far in the future
 *   - Every package has the required fields including copyrightText
 *   - Package SPDXID values are unique and match the SPDX identifier pattern
 *   - licenseConcluded / licenseDeclared are NOASSERTION, NONE, or a
 *     grammatically valid SPDX compound license expression whose leaf
 *     identifiers are either on the official SPDX 3.25 license/exception list
 *     or use the LicenseRef-/DocumentRef- prefix
 *   - downloadLocation is NOASSERTION, NONE, or an absolute URI
 *   - Every relationship endpoint resolves to SPDXRef-DOCUMENT or a declared
 *     package SPDXID — no dangling refs
 *   - At least one DESCRIBES relationship from SPDXRef-DOCUMENT is present
 *
 * Zero dependencies (Node built-ins only).
 *
 * Usage:
 *   node scripts/checks/validate-sbom.mjs <path-to-sbom.spdx.json>
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// SPDX 3.25 License and Exception lists (generated from https://spdx.org/licenses/)
// ---------------------------------------------------------------------------

/** @type {Set<string>} */
const SPDX_LICENSE_IDS = new Set(["0BSD","3D-Slicer-1.0","AAL","ADSL","AFL-1.1","AFL-1.2","AFL-2.0","AFL-2.1","AFL-3.0","AGPL-1.0","AGPL-1.0-only","AGPL-1.0-or-later","AGPL-3.0","AGPL-3.0-only","AGPL-3.0-or-later","ALGLIB-Documentation","AMD-newlib","AMDPLPA","AML","AML-glslang","AMPAS","ANTLR-PD","ANTLR-PD-fallback","APAFML","APL-1.0","APSL-1.0","APSL-1.1","APSL-1.2","APSL-2.0","ASWF-Digital-Assets-1.0","ASWF-Digital-Assets-1.1","Abstyles","AdaCore-doc","Adobe-2006","Adobe-Display-PostScript","Adobe-Glyph","Adobe-Utopia","Advanced-Cryptics-Dictionary","Afmparse","Aladdin","Apache-1.0","Apache-1.1","Apache-2.0","App-s2p","Arphic-1999","Artistic-1.0","Artistic-1.0-Perl","Artistic-1.0-cl8","Artistic-2.0","Artistic-dist","Aspell-RU","BOLA-1.1","BSD-1-Clause","BSD-2-Clause","BSD-2-Clause-Darwin","BSD-2-Clause-FreeBSD","BSD-2-Clause-NetBSD","BSD-2-Clause-Patent","BSD-2-Clause-Views","BSD-2-Clause-first-lines","BSD-2-Clause-pkgconf-disclaimer","BSD-3-Clause","BSD-3-Clause-Attribution","BSD-3-Clause-Clear","BSD-3-Clause-HP","BSD-3-Clause-LBNL","BSD-3-Clause-Modification","BSD-3-Clause-No-Military-License","BSD-3-Clause-No-Nuclear-License","BSD-3-Clause-No-Nuclear-License-2014","BSD-3-Clause-No-Nuclear-Warranty","BSD-3-Clause-Open-MPI","BSD-3-Clause-Sun","BSD-3-Clause-Tso","BSD-3-Clause-acpica","BSD-3-Clause-flex","BSD-4-Clause","BSD-4-Clause-Shortened","BSD-4-Clause-UC","BSD-4.3RENO","BSD-4.3TAHOE","BSD-Advertising-Acknowledgement","BSD-Attribution-HPND-disclaimer","BSD-Inferno-Nettverk","BSD-Mark-Modifications","BSD-Protection","BSD-Source-Code","BSD-Source-beginning-file","BSD-Systemics","BSD-Systemics-W3Works","BSL-1.0","BUSL-1.1","Baekmuk","Bahyph","Barr","Beerware","BitTorrent-1.0","BitTorrent-1.1","Bitstream-Charter","Bitstream-Vera","BlueOak-1.0.0","Boehm-GC","Boehm-GC-without-fee","Borceux","Brian-Gladman-2-Clause","Brian-Gladman-3-Clause","Buddy","C-UDA-1.0","CAL-1.0","CAL-1.0-Combined-Work-Exception","CAPEC-tou","CATOSL-1.1","CC-BY-1.0","CC-BY-2.0","CC-BY-2.5","CC-BY-2.5-AU","CC-BY-3.0","CC-BY-3.0-AT","CC-BY-3.0-AU","CC-BY-3.0-DE","CC-BY-3.0-IGO","CC-BY-3.0-NL","CC-BY-3.0-US","CC-BY-4.0","CC-BY-NC-1.0","CC-BY-NC-2.0","CC-BY-NC-2.5","CC-BY-NC-3.0","CC-BY-NC-3.0-DE","CC-BY-NC-4.0","CC-BY-NC-ND-1.0","CC-BY-NC-ND-2.0","CC-BY-NC-ND-2.5","CC-BY-NC-ND-3.0","CC-BY-NC-ND-3.0-DE","CC-BY-NC-ND-3.0-IGO","CC-BY-NC-ND-4.0","CC-BY-NC-SA-1.0","CC-BY-NC-SA-2.0","CC-BY-NC-SA-2.0-DE","CC-BY-NC-SA-2.0-FR","CC-BY-NC-SA-2.0-UK","CC-BY-NC-SA-2.5","CC-BY-NC-SA-3.0","CC-BY-NC-SA-3.0-DE","CC-BY-NC-SA-3.0-IGO","CC-BY-NC-SA-4.0","CC-BY-ND-1.0","CC-BY-ND-2.0","CC-BY-ND-2.5","CC-BY-ND-3.0","CC-BY-ND-3.0-DE","CC-BY-ND-4.0","CC-BY-SA-1.0","CC-BY-SA-2.0","CC-BY-SA-2.0-UK","CC-BY-SA-2.1-JP","CC-BY-SA-2.5","CC-BY-SA-3.0","CC-BY-SA-3.0-AT","CC-BY-SA-3.0-DE","CC-BY-SA-3.0-IGO","CC-BY-SA-4.0","CC-PDDC","CC-PDM-1.0","CC-SA-1.0","CC0-1.0","CDDL-1.0","CDDL-1.1","CDL-1.0","CDLA-Permissive-1.0","CDLA-Permissive-2.0","CDLA-Sharing-1.0","CECILL-1.0","CECILL-1.1","CECILL-2.0","CECILL-2.1","CECILL-B","CECILL-C","CERN-OHL-1.1","CERN-OHL-1.2","CERN-OHL-P-2.0","CERN-OHL-S-2.0","CERN-OHL-W-2.0","CFITSIO","CMU-Mach","CMU-Mach-nodoc","CNRI-Jython","CNRI-Python","CNRI-Python-GPL-Compatible","COIL-1.0","CPAL-1.0","CPL-1.0","CPOL-1.02","CUA-OPL-1.0","Caldera","Caldera-no-preamble","Catharon","ClArtistic","Clips","Community-Spec-1.0","Condor-1.1","Cornell-Lossless-JPEG","Cronyx","Crossword","CryptoSwift","CrystalStacker","Cube","D-FSL-1.0","DEC-3-Clause","DL-DE-BY-2.0","DL-DE-ZERO-2.0","DOC","DRL-1.0","DRL-1.1","DSDP","DocBook-DTD","DocBook-Schema","DocBook-Stylesheet","DocBook-XML","Dotseqn","ECL-1.0","ECL-2.0","EFL-1.0","EFL-2.0","EPICS","EPL-1.0","EPL-2.0","ESA-PL-permissive-2.4","ESA-PL-strong-copyleft-2.4","ESA-PL-weak-copyleft-2.4","EUDatagrid","EUPL-1.0","EUPL-1.1","EUPL-1.2","Elastic-2.0","Entessa","ErlPL-1.1","Eurosym","FBM","FDK-AAC","FSFAP","FSFAP-no-warranty-disclaimer","FSFUL","FSFULLR","FSFULLRSD","FSFULLRWD","FSL-1.1-ALv2","FSL-1.1-MIT","FTL","Fair","Ferguson-Twofish","Frameworx-1.0","FreeBSD-DOC","FreeImage","Furuseth","GCR-docs","GD","GFDL-1.1","GFDL-1.1-invariants-only","GFDL-1.1-invariants-or-later","GFDL-1.1-no-invariants-only","GFDL-1.1-no-invariants-or-later","GFDL-1.1-only","GFDL-1.1-or-later","GFDL-1.2","GFDL-1.2-invariants-only","GFDL-1.2-invariants-or-later","GFDL-1.2-no-invariants-only","GFDL-1.2-no-invariants-or-later","GFDL-1.2-only","GFDL-1.2-or-later","GFDL-1.3","GFDL-1.3-invariants-only","GFDL-1.3-invariants-or-later","GFDL-1.3-no-invariants-only","GFDL-1.3-no-invariants-or-later","GFDL-1.3-only","GFDL-1.3-or-later","GL2PS","GLWTPL","GPL-1.0","GPL-1.0+","GPL-1.0-only","GPL-1.0-or-later","GPL-2.0","GPL-2.0+","GPL-2.0-only","GPL-2.0-or-later","GPL-2.0-with-GCC-exception","GPL-2.0-with-autoconf-exception","GPL-2.0-with-bison-exception","GPL-2.0-with-classpath-exception","GPL-2.0-with-font-exception","GPL-3.0","GPL-3.0+","GPL-3.0-only","GPL-3.0-or-later","GPL-3.0-with-GCC-exception","GPL-3.0-with-autoconf-exception","Game-Programming-Gems","Giftware","Glide","Glulxe","Graphics-Gems","Gutmann","HDF5","HIDAPI","HP-1986","HP-1989","HPND","HPND-DEC","HPND-Fenneberg-Livingston","HPND-INRIA-IMAG","HPND-Intel","HPND-Kevlin-Henney","HPND-MIT-disclaimer","HPND-Markus-Kuhn","HPND-Netrek","HPND-Pbmplus","HPND-SMC","HPND-UC","HPND-UC-export-US","HPND-doc","HPND-doc-sell","HPND-export-US","HPND-export-US-acknowledgement","HPND-export-US-modify","HPND-export2-US","HPND-merchantability-variant","HPND-sell-MIT-disclaimer-xserver","HPND-sell-regexpr","HPND-sell-variant","HPND-sell-variant-MIT-disclaimer","HPND-sell-variant-MIT-disclaimer-rev","HPND-sell-variant-critical-systems","HTMLTIDY","HaskellReport","Hippocratic-2.1","IBM-pibs","ICU","IEC-Code-Components-EULA","IJG","IJG-short","IPA","IPL-1.0","ISC","ISC-Veillard","ISO-permission","ImageMagick","Imlib2","Info-ZIP","Inner-Net-2.0","InnoSetup","Intel","Intel-ACPI","Interbase-1.0","JPL-image","JPNIC","JSON","Jam","JasPer-2.0","Kastrup","Kazlib","Knuth-CTAN","LAL-1.2","LAL-1.3","LGPL-2.0","LGPL-2.0+","LGPL-2.0-only","LGPL-2.0-or-later","LGPL-2.1","LGPL-2.1+","LGPL-2.1-only","LGPL-2.1-or-later","LGPL-3.0","LGPL-3.0+","LGPL-3.0-only","LGPL-3.0-or-later","LGPLLR","LOOP","LPD-document","LPL-1.0","LPL-1.02","LPPL-1.0","LPPL-1.1","LPPL-1.2","LPPL-1.3a","LPPL-1.3c","LZMA-SDK-9.11-to-9.20","LZMA-SDK-9.22","Latex2e","Latex2e-translated-notice","Leptonica","LiLiQ-P-1.1","LiLiQ-R-1.1","LiLiQ-Rplus-1.1","Libpng","Linux-OpenIB","Linux-man-pages-1-para","Linux-man-pages-copyleft","Linux-man-pages-copyleft-2-para","Linux-man-pages-copyleft-var","Lucida-Bitmap-Fonts","MIPS","MIT","MIT-0","MIT-CMU","MIT-Click","MIT-Festival","MIT-Khronos-old","MIT-Modern-Variant","MIT-STK","MIT-Wu","MIT-advertising","MIT-enna","MIT-feh","MIT-open-group","MIT-testregex","MITNFA","MMIXware","MMPL-1.0.1","MPEG-SSG","MPL-1.0","MPL-1.1","MPL-2.0","MPL-2.0-no-copyleft-exception","MS-LPL","MS-PL","MS-RL","MTLL","Mackerras-3-Clause","Mackerras-3-Clause-acknowledgment","MakeIndex","Martin-Birgmeier","McPhee-slideshow","Minpack","MirOS","Motosoto","MulanPSL-1.0","MulanPSL-2.0","Multics","Mup","NAIST-2003","NASA-1.3","NBPL-1.0","NCBI-PD","NCGL-UK-2.0","NCL","NCSA","NGPL","NICTA-1.0","NIST-PD","NIST-PD-TNT","NIST-PD-fallback","NIST-Software","NLOD-1.0","NLOD-2.0","NLPL","NOSL","NPL-1.0","NPL-1.1","NPOSL-3.0","NRL","NTIA-PD","NTP","NTP-0","Naumen","Net-SNMP","NetCDF","Newsletr","Nokia","Noweb","Nunit","O-UDA-1.0","OAR","OCCT-PL","OCLC-2.0","ODC-By-1.0","ODbL-1.0","OFFIS","OFL-1.0","OFL-1.0-RFN","OFL-1.0-no-RFN","OFL-1.1","OFL-1.1-RFN","OFL-1.1-no-RFN","OGC-1.0","OGDL-Taiwan-1.0","OGL-Canada-2.0","OGL-UK-1.0","OGL-UK-2.0","OGL-UK-3.0","OGTSL","OLDAP-1.1","OLDAP-1.2","OLDAP-1.3","OLDAP-1.4","OLDAP-2.0","OLDAP-2.0.1","OLDAP-2.1","OLDAP-2.2","OLDAP-2.2.1","OLDAP-2.2.2","OLDAP-2.3","OLDAP-2.4","OLDAP-2.5","OLDAP-2.6","OLDAP-2.7","OLDAP-2.8","OLFL-1.3","OML","OPL-1.0","OPL-UK-3.0","OPUBL-1.0","OSC-1.0","OSET-PL-2.1","OSL-1.0","OSL-1.1","OSL-2.0","OSL-2.1","OSL-3.0","OSSP","OpenMDW-1.0","OpenPBS-2.3","OpenSSL","OpenSSL-standalone","OpenVision","PADL","PDDL-1.0","PHP-3.0","PHP-3.01","PPL","PSF-2.0","ParaType-Free-Font-1.3","Parity-6.0.0","Parity-7.0.0","Pixar","Plexus","PolyForm-Noncommercial-1.0.0","PolyForm-Small-Business-1.0.0","PostgreSQL","Python-2.0","Python-2.0.1","QPL-1.0","QPL-1.0-INRIA-2004","Qhull","RHeCos-1.1","RPL-1.1","RPL-1.5","RPSL-1.0","RSA-MD","RSCPL","Rdisc","Ruby","Ruby-pty","SAX-PD","SAX-PD-2.0","SCEA","SGI-B-1.0","SGI-B-1.1","SGI-B-2.0","SGI-OpenGL","SGMLUG-PM","SGP4","SHL-0.5","SHL-0.51","SISSL","SISSL-1.2","SL","SMAIL-GPL","SMLNJ","SMPPL","SNIA","SOFA","SPL-1.0","SSH-OpenSSH","SSH-short","SSLeay-standalone","SSPL-1.0","SUL-1.0","SWL","Saxpath","SchemeReport","Sendmail","Sendmail-8.23","Sendmail-Open-Source-1.1","SimPL-2.0","Sleepycat","Soundex","Spencer-86","Spencer-94","Spencer-99","StandardML-NJ","SugarCRM-1.1.3","Sun-PPP","Sun-PPP-2000","SunPro","Symlinks","TAPR-OHL-1.0","TCL","TCP-wrappers","TGPPL-1.0","TMate","TORQUE-1.1","TOSL","TPDL","TPL-1.0","TTWL","TTYP0","TU-Berlin-1.0","TU-Berlin-2.0","TekHVC","TermReadKey","ThirdEye","TrustedQSL","UCAR","UCL-1.0","UMich-Merit","UPL-1.0","URT-RLE","Ubuntu-font-1.0","UnRAR","Unicode-3.0","Unicode-DFS-2015","Unicode-DFS-2016","Unicode-TOU","UnixCrypt","Unlicense","Unlicense-libtelnet","Unlicense-libwhirlpool","VOSTROM","VSL-1.0","Vim","Vixie-Cron","W3C","W3C-19980720","W3C-20150513","WTFNMFPL","WTFPL","Watcom-1.0","Widget-Workshop","WordNet","Wsuipa","X11","X11-distribute-modifications-variant","X11-no-permit-persons","X11-swapped","XFree86-1.1","XSkat","Xdebug-1.03","Xerox","Xfig","Xnet","YPL-1.0","YPL-1.1","ZPL-1.1","ZPL-2.0","ZPL-2.1","Zed","Zeeff","Zend-2.0","Zimbra-1.3","Zimbra-1.4","Zlib","any-OSI","any-OSI-perl-modules","bcrypt-Solar-Designer","blessing","bzip2-1.0.5","bzip2-1.0.6","check-cvs","checkmk","copyleft-next-0.3.0","copyleft-next-0.3.1","curl","cve-tou","diffmark","dtoa","dvipdfm","eCos-2.0","eGenix","etalab-2.0","fwlw","gSOAP-1.3b","generic-xts","gnuplot","gtkbook","hdparm","hyphen-bulgarian","iMatix","jove","libpng-1.6.35","libpng-2.0","libselinux-1.0","libtiff","libutil-David-Nugent","lsof","magaz","mailprio","man2html","metamail","mpi-permissive","mpich2","mplus","ngrep","pkgconf","pnmstitch","psfrag","psutils","python-ldap","radvd","snprintf","softSurfer","ssh-keyscan","swrule","threeparttable","ulem","w3m","wwl","wxWindows","xinetd","xkeyboard-config-Zinoviev","xlock","xpp","xzoom","zlib-acknowledgement"]);

/** @type {Set<string>} */
const SPDX_EXCEPTION_IDS = new Set(["389-exception","Asterisk-exception","Asterisk-linking-protocols-exception","Autoconf-exception-2.0","Autoconf-exception-3.0","Autoconf-exception-generic","Autoconf-exception-generic-3.0","Autoconf-exception-macro","Bison-exception-1.24","Bison-exception-2.2","Bootloader-exception","CGAL-linking-exception","CLISP-exception-2.0","Classpath-exception-2.0","Classpath-exception-2.0-short","DigiRule-FOSS-exception","Digia-Qt-LGPL-exception-1.1","FLTK-exception","Fawkes-Runtime-exception","Font-exception-2.0","GCC-exception-2.0","GCC-exception-2.0-note","GCC-exception-3.1","GNAT-exception","GNOME-examples-exception","GNU-compiler-exception","GPL-3.0-389-ds-base-exception","GPL-3.0-interface-exception","GPL-3.0-linking-exception","GPL-3.0-linking-source-exception","GPL-CC-1.0","GStreamer-exception-2005","GStreamer-exception-2008","Gmsh-exception","Independent-modules-exception","KiCad-libraries-exception","LGPL-3.0-linking-exception","LLGPL","LLVM-exception","LZMA-exception","Libtool-exception","Linux-syscall-note","Nokia-Qt-exception-1.1","OCCT-exception-1.0","OCaml-LGPL-linking-exception","OpenJDK-assembly-exception-1.0","PCRE2-exception","PS-or-PDF-font-exception-20170817","QPL-1.0-INRIA-2004-exception","Qt-GPL-exception-1.0","Qt-LGPL-exception-1.1","Qwt-exception-1.0","RRDtool-FLOSS-exception-2.0","SANE-exception","SHL-2.0","SHL-2.1","SWI-exception","Simple-Library-Usage-exception","Swift-exception","Texinfo-exception","UBDL-exception","Universal-FOSS-exception-1.0","WxWindows-exception-3.1","cryptsetup-OpenSSL-exception","eCos-exception-2.0","erlang-otp-linking-exception","fmt-exception","freertos-exception-2.0","gnu-javamail-exception","harbour-exception","i2p-gpl-java-exception","kvirc-openssl-exception","libpri-OpenH323-exception","mif-exception","mxml-exception","openvpn-openssl-exception","polyparse-exception","romic-exception","rsync-linking-exception","sqlitestudio-OpenSSL-exception","stunnel-exception","u-boot-exception-2.0","vsftpd-openssl-exception","x11vnc-openssl-exception"]);


// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** SPDX element identifier pattern — SPDX 2.3 §2.3. */
const SPDXID_RE = /^SPDXRef-[\w.\-]+$/;

/** ISO 8601 UTC datetime as required by SPDX creationInfo.created. */
const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/**
 * Valid SPDX 2.3 relationship types (Annex J of the spec).
 * @type {Set<string>}
 */
const VALID_RELATIONSHIP_TYPES = new Set([
  "DESCRIBES","DESCRIBED_BY","CONTAINS","CONTAINED_BY",
  "GENERATES","GENERATED_FROM","ANCESTOR_OF","DESCENDANT_OF",
  "VARIANT_OF","BUILD_TOOL_OF","DEV_TOOL_OF","TEST_TOOL_OF",
  "DOCUMENTATION_OF","OPTIONAL_COMPONENT_OF","METAFILE_OF",
  "PACKAGE_OF","AMENDS","PREREQUISITE_FOR","HAS_PREREQUISITE",
  "REQUIREMENT_DESCRIPTION_FOR","SPECIFICATION_FOR",
  "DYNAMIC_LINK","STATIC_LINK","DATA_FILE_OF","TEST_CASE_OF",
  "BUILD_DEPENDENCY_OF","DEV_DEPENDENCY_OF","OPTIONAL_DEPENDENCY_OF",
  "PROVIDED_DEPENDENCY_OF","TEST_DEPENDENCY_OF","RUNTIME_DEPENDENCY_OF",
  "EXAMPLE_OF","OTHER","NOASSERTION","NONE",
]);

// ---------------------------------------------------------------------------
// SPDX license-expression parser
// ---------------------------------------------------------------------------
//
// Grammar (SPDX 2.3 Appendix IV):
//   license-expression  ::= or-expression
//   or-expression       ::= and-expression ("OR" and-expression)*
//   and-expression      ::= with-expression ("AND" with-expression)*
//   with-expression     ::= simple-expression ("WITH" exception-id)?
//   simple-expression   ::= license-id ["+"] | "(" license-expression ")"
//   license-id          ::= SPDX-License-Identifier
//                         | "LicenseRef-" idstring
//                         | "DocumentRef-" idstring ":" "LicenseRef-" idstring
//   exception-id        ::= SPDX-License-Exception-Identifier
//
// Identifiers are validated against the official SPDX 3.25 license/exception
// lists.  Custom identifiers MUST use the LicenseRef- (or DocumentRef:LicenseRef-)
// prefix; arbitrary unknown tokens are rejected.

/** @param {string} s */
function tokenizeSpdx(s) {
  /** @type {string[]} */
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (ch === " " || ch === "\t" || ch === "\n") { i++; continue; }
    if (ch === "(") { tokens.push("("); i++; continue; }
    if (ch === ")") { tokens.push(")"); i++; continue; }
    let j = i;
    while (j < s.length && s[j] !== " " && s[j] !== "\t" && s[j] !== "\n" && s[j] !== "(" && s[j] !== ")") j++;
    tokens.push(s.slice(i, j));
    i = j;
  }
  return tokens;
}

/**
 * Returns true if the token is a valid SPDX license identifier leaf.
 * Strips a trailing "+" (or-later suffix) before checking.
 *
 * @param {string} t
 * @returns {boolean}
 */
function isLicenseId(t) {
  // LicenseRef-<idstring>
  if (/^LicenseRef-[a-zA-Z0-9\.\-]+$/.test(t)) return true;
  // DocumentRef-<idstring>:LicenseRef-<idstring>
  if (/^DocumentRef-[a-zA-Z0-9\.\-]+:LicenseRef-[a-zA-Z0-9\.\-]+$/.test(t)) return true;
  // Standard SPDX license ID, optionally followed by "+" (or-later modifier)
  const base = t.endsWith("+") ? t.slice(0, -1) : t;
  return SPDX_LICENSE_IDS.has(base);
}

/**
 * Returns true if the token is a valid SPDX exception identifier.
 * @param {string} t
 */
function isExceptionId(t) {
  return SPDX_EXCEPTION_IDS.has(t) || /^LicenseRef-[a-zA-Z0-9\.\-]+$/.test(t);
}

/**
 * Recursive descent parser for SPDX license expressions.
 * Returns [ok, newPos].
 *
 * @param {string[]} tokens @param {number} pos @returns {[boolean, number]}
 */
function parseOrExpr(tokens, pos) {
  let [ok, p] = parseAndExpr(tokens, pos);
  if (!ok) return [false, p];
  while (p < tokens.length && tokens[p] === "OR") {
    p++;
    let res; [ok, res] = parseAndExpr(tokens, p);
    if (!ok) return [false, res];
    p = res;
  }
  return [true, p];
}

/** @param {string[]} tokens @param {number} pos @returns {[boolean, number]} */
function parseAndExpr(tokens, pos) {
  let [ok, p] = parseWithExpr(tokens, pos);
  if (!ok) return [false, p];
  while (p < tokens.length && tokens[p] === "AND") {
    p++;
    let res; [ok, res] = parseWithExpr(tokens, p);
    if (!ok) return [false, res];
    p = res;
  }
  return [true, p];
}

/** @param {string[]} tokens @param {number} pos @returns {[boolean, number]} */
function parseWithExpr(tokens, pos) {
  const [ok, p] = parseSimpleExpr(tokens, pos);
  if (!ok) return [false, p];
  if (p < tokens.length && tokens[p] === "WITH") {
    const np = p + 1;
    if (np >= tokens.length || !isExceptionId(tokens[np])) return [false, np];
    return [true, np + 1];
  }
  return [true, p];
}

/** @param {string[]} tokens @param {number} pos @returns {[boolean, number]} */
function parseSimpleExpr(tokens, pos) {
  if (pos >= tokens.length) return [false, pos];
  if (tokens[pos] === "(") {
    const [ok, p] = parseOrExpr(tokens, pos + 1);
    if (!ok) return [false, p];
    if (p >= tokens.length || tokens[p] !== ")") return [false, p];
    return [true, p + 1];
  }
  if (isLicenseId(tokens[pos])) return [true, pos + 1];
  return [false, pos];
}

/**
 * Validates a SPDX 2.3 license expression string.
 *
 * @param {string} expr
 * @returns {string | null}  null if valid; error message if invalid.
 */
export function validateSpdxExpression(expr) {
  if (typeof expr !== "string") return "must be a string";
  const trimmed = expr.trim();
  if (trimmed === "NOASSERTION" || trimmed === "NONE") return null;
  if (trimmed.length === 0) return "empty expression";

  const tokens = tokenizeSpdx(trimmed);
  if (tokens.length === 0) return "empty expression";

  const keywords = new Set(["AND", "OR", "WITH"]);
  if (tokens.length === 1 && keywords.has(tokens[0])) {
    return `bare keyword "${tokens[0]}" is not a valid license expression`;
  }

  const [ok, pos] = parseOrExpr(tokens, 0);
  if (!ok) {
    const near = tokens[pos] != null ? ` near "${tokens[pos]}"` : " (unexpected end)";
    return `invalid SPDX license expression${near} — use an SPDX identifier from https://spdx.org/licenses/ or LicenseRef-<name> for custom licenses`;
  }
  if (pos !== tokens.length) {
    return `unexpected token "${tokens[pos]}" — missing AND/OR between identifiers?`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// downloadLocation validation
// ---------------------------------------------------------------------------

/**
 * Validates a SPDX package downloadLocation value.
 * Must be NOASSERTION, NONE, or an absolute URI.
 *
 * @param {string} loc
 * @returns {string | null}  null if valid; error message if invalid.
 */
export function validateDownloadLocation(loc) {
  if (typeof loc !== "string" || loc.length === 0) return "must be a non-empty string";
  if (loc === "NOASSERTION" || loc === "NONE") return null;
  try {
    const url = new URL(loc);
    // Reject relative-protocol and non-absolute schemes that slip through
    if (!url.protocol || url.protocol.length < 3) return `not a valid absolute URI: "${loc}"`;
    return null;
  } catch {
    return `not a valid absolute URI, NOASSERTION, or NONE: "${loc}"`;
  }
}

// ---------------------------------------------------------------------------
// Validation logic (exported for unit tests)
// ---------------------------------------------------------------------------

/**
 * Validates an SPDX 2.3 JSON document.
 *
 * @param {unknown} doc  Parsed JSON value from the SBOM file.
 * @returns {string[]}   List of violation messages; empty array means valid.
 */
export function validateSbom(doc) {
  /** @type {string[]} */
  const errors = [];

  if (doc === null || typeof doc !== "object" || Array.isArray(doc)) {
    return ["document root must be a JSON object"];
  }

  const d = /** @type {Record<string, unknown>} */ (doc);

  // -------------------------------------------------------------------------
  // Top-level required fields
  // -------------------------------------------------------------------------

  if (d["spdxVersion"] !== "SPDX-2.3") {
    errors.push(`spdxVersion must be "SPDX-2.3", got ${JSON.stringify(d["spdxVersion"])}`);
  }

  if (d["dataLicense"] !== "CC0-1.0") {
    errors.push(`dataLicense must be "CC0-1.0", got ${JSON.stringify(d["dataLicense"])}`);
  }

  if (d["SPDXID"] !== "SPDXRef-DOCUMENT") {
    errors.push(`SPDXID must be "SPDXRef-DOCUMENT", got ${JSON.stringify(d["SPDXID"])}`);
  }

  if (typeof d["name"] !== "string" || d["name"].length === 0) {
    errors.push("name must be a non-empty string");
  }

  // documentNamespace must be an absolute URI (SPDX 2.3 §2.5)
  if (typeof d["documentNamespace"] !== "string" || d["documentNamespace"].length === 0) {
    errors.push("documentNamespace must be a non-empty string");
  } else {
    let nsValid = false;
    try {
      const url = new URL(d["documentNamespace"]);
      nsValid = url.protocol === "https:" || url.protocol === "http:" || url.protocol === "urn:";
    } catch { nsValid = false; }
    if (!nsValid) {
      errors.push(
        `documentNamespace must be an absolute URI (https://, http://, or urn:), got ${JSON.stringify(d["documentNamespace"])}`,
      );
    }
  }

  // -------------------------------------------------------------------------
  // creationInfo
  // -------------------------------------------------------------------------

  const ci = d["creationInfo"];
  if (ci === null || typeof ci !== "object" || Array.isArray(ci)) {
    errors.push("creationInfo must be an object");
  } else {
    const c = /** @type {Record<string, unknown>} */ (ci);

    if (typeof c["created"] !== "string" || !ISO_DATETIME_RE.test(c["created"])) {
      errors.push(
        `creationInfo.created must be an ISO 8601 UTC datetime ending in Z (e.g. "2026-08-01T00:00:00Z"), got ${JSON.stringify(c["created"])}`,
      );
    } else {
      const ts = Date.parse(c["created"]);
      if (Number.isNaN(ts)) {
        errors.push(`creationInfo.created "${c["created"]}" is not a valid date`);
      } else if (ts > Date.now() + 365 * 24 * 60 * 60 * 1000) {
        errors.push(`creationInfo.created "${c["created"]}" is more than one year in the future`);
      }
    }

    if (!Array.isArray(c["creators"]) || c["creators"].length === 0) {
      errors.push("creationInfo.creators must be a non-empty array");
    } else {
      for (let i = 0; i < c["creators"].length; i++) {
        if (typeof c["creators"][i] !== "string") {
          errors.push(`creationInfo.creators[${i}] must be a string`);
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // packages
  // -------------------------------------------------------------------------

  const declaredIds = new Set(["SPDXRef-DOCUMENT"]);

  if (!Array.isArray(d["packages"]) || d["packages"].length === 0) {
    errors.push("packages must be a non-empty array");
  } else {
    const seenIds = new Set();

    for (let i = 0; i < d["packages"].length; i++) {
      const p = d["packages"][i];
      const prefix = `packages[${i}]`;

      if (p === null || typeof p !== "object" || Array.isArray(p)) {
        errors.push(`${prefix} must be an object`);
        continue;
      }

      const pkg = /** @type {Record<string, unknown>} */ (p);

      if (typeof pkg["SPDXID"] !== "string" || !SPDXID_RE.test(pkg["SPDXID"])) {
        errors.push(`${prefix}.SPDXID must match /^SPDXRef-[\\w.\\-]+$/, got ${JSON.stringify(pkg["SPDXID"])}`);
      } else if (seenIds.has(pkg["SPDXID"])) {
        errors.push(`${prefix}.SPDXID "${pkg["SPDXID"]}" is duplicated`);
      } else {
        seenIds.add(pkg["SPDXID"]);
        declaredIds.add(pkg["SPDXID"]);
      }

      if (typeof pkg["name"] !== "string" || pkg["name"].length === 0) {
        errors.push(`${prefix}.name must be a non-empty string`);
      }

      if (typeof pkg["versionInfo"] !== "string") {
        errors.push(`${prefix}.versionInfo must be a string (use "NOASSERTION" if unknown)`);
      }

      const dlErr = validateDownloadLocation(/** @type {string} */ (pkg["downloadLocation"]));
      if (dlErr !== null) errors.push(`${prefix}.downloadLocation: ${dlErr}`);

      if (pkg["filesAnalyzed"] !== undefined && typeof pkg["filesAnalyzed"] !== "boolean") {
        errors.push(`${prefix}.filesAnalyzed must be a boolean if present`);
      }

      const lcErr = validateSpdxExpression(/** @type {string} */ (pkg["licenseConcluded"]));
      if (lcErr !== null) errors.push(`${prefix}.licenseConcluded: ${lcErr}`);

      const ldErr = validateSpdxExpression(/** @type {string} */ (pkg["licenseDeclared"]));
      if (ldErr !== null) errors.push(`${prefix}.licenseDeclared: ${ldErr}`);

      if (typeof pkg["copyrightText"] !== "string" || pkg["copyrightText"].length === 0) {
        errors.push(`${prefix}.copyrightText must be a non-empty string (use "NOASSERTION" if unknown)`);
      }
    }
  }

  // -------------------------------------------------------------------------
  // relationships
  // -------------------------------------------------------------------------

  if (!Array.isArray(d["relationships"]) || d["relationships"].length === 0) {
    errors.push("relationships must be a non-empty array");
  } else {
    let hasDescribes = false;

    for (let i = 0; i < d["relationships"].length; i++) {
      const r = d["relationships"][i];
      const prefix = `relationships[${i}]`;

      if (r === null || typeof r !== "object" || Array.isArray(r)) {
        errors.push(`${prefix} must be an object`);
        continue;
      }

      const rel = /** @type {Record<string, unknown>} */ (r);

      if (typeof rel["spdxElementId"] !== "string" || !SPDXID_RE.test(rel["spdxElementId"])) {
        errors.push(`${prefix}.spdxElementId must match SPDXID pattern, got ${JSON.stringify(rel["spdxElementId"])}`);
      } else if (!declaredIds.has(rel["spdxElementId"])) {
        errors.push(`${prefix}.spdxElementId "${rel["spdxElementId"]}" does not refer to a declared element in this document`);
      }

      if (typeof rel["relatedSpdxElement"] !== "string" || !SPDXID_RE.test(rel["relatedSpdxElement"])) {
        errors.push(`${prefix}.relatedSpdxElement must match SPDXID pattern, got ${JSON.stringify(rel["relatedSpdxElement"])}`);
      } else if (!declaredIds.has(rel["relatedSpdxElement"])) {
        errors.push(`${prefix}.relatedSpdxElement "${rel["relatedSpdxElement"]}" does not refer to a declared element in this document`);
      }

      if (typeof rel["relationshipType"] !== "string") {
        errors.push(`${prefix}.relationshipType must be a string`);
      } else if (!VALID_RELATIONSHIP_TYPES.has(rel["relationshipType"])) {
        errors.push(`${prefix}.relationshipType "${rel["relationshipType"]}" is not a recognised SPDX 2.3 relationship type (see Annex J)`);
      }

      if (rel["spdxElementId"] === "SPDXRef-DOCUMENT" && rel["relationshipType"] === "DESCRIBES") {
        hasDescribes = true;
      }
    }

    if (!hasDescribes) {
      errors.push("relationships must contain at least one DESCRIBES relationship from SPDXRef-DOCUMENT");
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

const isCli =
  process.argv[1] != null &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isCli) {
  const [, , sbomPath] = process.argv;
  if (!sbomPath) {
    console.error("Usage: node scripts/checks/validate-sbom.mjs <sbom.spdx.json>");
    process.exit(1);
  }

  let raw;
  try { raw = readFileSync(sbomPath, "utf8"); }
  catch (/** @type {unknown} */ e) { console.error(`Cannot read file "${sbomPath}": ${String(e)}`); process.exit(1); }

  let doc;
  try { doc = JSON.parse(raw); }
  catch (/** @type {unknown} */ e) { console.error(`"${sbomPath}" is not valid JSON: ${String(e)}`); process.exit(1); }

  const errors = validateSbom(doc);
  if (errors.length > 0) {
    console.error(`SBOM validation FAILED — ${errors.length} violation(s):\n`);
    for (const err of errors) console.error(`  • ${err}`);
    process.exit(1);
  }
  console.log(`SBOM validation passed: "${sbomPath}" is a valid SPDX 2.3 document.`);
}

// ---------------------------------------------------------------------------
// fileURLToPath — inline helper so this file stays zero-dep
// ---------------------------------------------------------------------------
function fileURLToPath(/** @type {string | URL} */ url) {
  const href = typeof url === "string" ? url : url.href;
  return decodeURIComponent(href.replace(/^file:\/\//, "").replace(/^\/([A-Za-z]:)/, "$1"));
}
