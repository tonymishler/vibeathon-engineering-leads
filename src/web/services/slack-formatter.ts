import twemoji from 'twemoji';

interface FormattingOptions {
  preserveCase?: boolean;
}

export class SlackFormatter {
  private static readonly SPECIAL_MENTIONS = {
    '<!channel>': '@channel',
    '<!here>': '@here',
    '<!everyone>': '@everyone',
  };

  private static readonly EMOJI_REGEX = /:([\w+-]+):/g;
  private static readonly CODE_BLOCK_REGEX = /```([\s\S]*?)```/g;
  private static readonly INLINE_CODE_REGEX = /`([^`]+)`/g;
  private static readonly BOLD_REGEX = /\*([^*]+)\*/g;
  private static readonly ITALIC_REGEX = /_([^_]+)_/g;
  private static readonly STRIKETHROUGH_REGEX = /~([^~]+)~/g;
  private static readonly URL_REGEX = /<(https?:\/\/[^>|]+)(?:\|([^>]+))?>/g;

  static format(text: string, options: FormattingOptions = {}): string {
    let formattedText = text;

    // Preserve code blocks from formatting
    const codeBlocks: string[] = [];
    formattedText = formattedText.replace(this.CODE_BLOCK_REGEX, (match) => {
      codeBlocks.push(match);
      return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
    });

    // Handle special mentions
    Object.entries(this.SPECIAL_MENTIONS).forEach(([mention, replacement]) => {
      formattedText = formattedText.replace(
        new RegExp(mention, 'g'),
        `<span class="slack-mention">${replacement}</span>`
      );
    });

    // Handle emojis
    formattedText = formattedText.replace(this.EMOJI_REGEX, (match, emojiName) => {
      // Try native emoji first
      const nativeEmoji = this.getNativeEmoji(emojiName);
      if (nativeEmoji) {
        return nativeEmoji;
      }
      // Fallback to custom emoji placeholder
      return `<span class="slack-emoji" data-emoji="${emojiName}">:${emojiName}:</span>`;
    });

    // Format text styling
    formattedText = formattedText
      .replace(this.BOLD_REGEX, '<strong>$1</strong>')
      .replace(this.ITALIC_REGEX, '<em>$1</em>')
      .replace(this.STRIKETHROUGH_REGEX, '<del>$1</del>')
      .replace(this.INLINE_CODE_REGEX, '<code>$1</code>');

    // Handle URLs
    formattedText = formattedText.replace(
      this.URL_REGEX,
      (match, url, text) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${text || url}</a>`
    );

    // Restore code blocks
    codeBlocks.forEach((block, index) => {
      formattedText = formattedText.replace(
        `__CODE_BLOCK_${index}__`,
        `<pre><code>${block.slice(3, -3)}</code></pre>`
      );
    });

    // Convert unicode emojis to Twemoji
    formattedText = twemoji.parse(formattedText, {
      folder: 'svg',
      ext: '.svg',
      base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/'
    });

    return formattedText;
  }

  private static getNativeEmoji(name: string): string | null {
    // Common emoji mappings
    const emojiMap: Record<string, string> = {
      '+1': '👍',
      '-1': '👎',
      'smile': '😊',
      'laughing': '😄',
      'wink': '😉',
      'heart': '❤️',
      'rocket': '🚀',
      'fire': '🔥',
      'point_right': '👉',
      'point_left': '👈',
      'raised_hands': '🙌',
      'eyes': '👀',
      'thinking_face': '🤔',
      'zap': '⚡',
      // Add more mappings as needed
    };

    return emojiMap[name] || null;
  }
} 