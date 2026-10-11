"use client";

import { useMemo, useState } from 'react';
import { BookOpen, CircleDot, FileText, Menu, Palette, Rocket, Search, ShieldCheck, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import Link from 'next/link';

interface DocumentationImage {
  src: string;
  alt: string;
  caption?: string | React.ReactNode;
}

interface DocumentationSection {
  title: string;
  paragraphs: string[];
  images?: DocumentationImage[];
  list?: string[];
}

interface DocumentationTopic {
  id: string;
  title: string;
  icon: React.ReactNode;
  intro: string;
  sections: DocumentationSection[];
}

const TOPICS: DocumentationTopic[] = [
  {
    id: 'overview',
    title: 'Introduction',
    icon: <BookOpen size={18} />,
    intro: 'Understand the core features of LUNIO Builder and how the documentation is structured to help you get started.',
    sections: [
      {
        title: 'What is LUNIO Builder?',
        paragraphs: [
          'LUNIO Builder is a no-code website builder that allows you to create stunning websites with ease. With its intuitive drag-and-drop interface, you can design and publish your website in minutes, without any coding knowledge. LUNIO Builder provides a powerful set of tools to help you build and manage your online presence, whether you are a small business owner, a blogger, or anyone looking to create a website quickly and efficiently.',
        ],
        list: [
          'Drag-and-drop interface for easy website design',
          'Pre-built templates and customizable components',
          'Real-time preview and editing',
          'Built-in hosting and publishing options',
          'SEO optimization and analytics tools',
        ],
      },
      {
        title: 'How the documentation is organized',
        paragraphs: [
          'Use the left navigation to browse topics. Each section contains clear guidance on how to use the builder, work with your projects, and manage settings.',
        ],
      },
    ],
  },
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: <Rocket size={18} />,
    intro: 'Learn how to sign in, create your first project, and access the builder interface to start designing your website.',
    sections: [
      {
        title: 'Step 1: Sign in to your account',
        paragraphs: [
          'To use the builder, you need to sign in with your Google account. This allows you to create and manage your projects securely. We do not store your password and only use your email for authentication and account management purposes.',
        ],
        images: [
          {
            src: '/documentation/image.png',
            alt: 'Dashboard showing create project option',
            caption: 'Sign in with your Google account'
          }
        ]
      },
      {
        title: 'Step 2: Go to the dashboard',
        paragraphs: [
          'The dashboard is your central hub for managing all your website projects. Here you can create new projects, open existing ones, and access project settings.',
          'Depending on your account status, you may have access to different features or project limits. Check the pricing page for more details on available plans and features.',
        ],
        images: [
          {
            src: '/documentation/dash.png',
            alt: 'Dashboard showing project list',
            caption: 'Your project dashboard with all your website projects'
          }
        ]
      },
    ],
  },
  {
    id: 'builder-ui',
    title: 'Editor UI',
    icon: <SlidersHorizontal size={18} />,
    intro: 'Get familiar with the builder interface, including the left and right panels, canvas interaction, and how to add and edit elements on your page.',
    sections: [
      {
        title: 'Editor layout',
        paragraphs: [
          'The builder interface consists of three main areas: the left panel for adding elements, the central canvas for designing your page, and the right panel for editing properties of selected elements. Use the left panel to drag and drop components onto the canvas, and customize them using the right panel controls.',
        ],
        images: [
          {
            src: '/documentation/editor.png',
            alt: 'Builder UI showing left and right panels',
            caption: 'The main builder interface with panels for elements and properties'
          }
        ]
      },
      {
        title: 'Left panel: Adding elements',
        paragraphs: [
          'The left panel contains a variety of elements you can add to your page, such as text blocks, images, buttons, and more. Simply drag an element from the left panel onto the canvas to add it to your design. You can then select the element on the canvas to edit its properties in the right panel.',
        ],
        images: [
          {
            src: '/documentation/left-panel.png',
            alt: 'Left panel showing available elements',
            caption: 'Adding elements to your page from the left panel'
          }
        ]
      },
      {
        title: 'Right panel: Editing properties',
        paragraphs: [
          'When you select an element on the canvas, the right panel displays its properties and styling options. Here you can customize the appearance, layout, and behavior of the element. Make changes to colors, fonts, spacing, and more to create a unique design for your website.',
        ],
        images: [
          {
            src: '/documentation/right-panel.png',
            alt: 'Right panel showing element properties',
            caption: 'Editing element properties in the right panel'
          }
        ]
      },
    ],
  },
  {
    id: 'Styling',
    title: 'Styling',
    icon: <Palette size={18} />,
    intro: 'Learn how to customize the look and feel of your website using the styling options available in the builder. This includes changing colors, fonts, spacing, and other design properties to create a unique and visually appealing website.',
    sections: [
      {
        title: 'Layout styling',
        paragraphs: [
          'Use the layout controls in the right panel to adjust the spacing, alignment, and positioning of elements on your page. You can set margins, padding, and flexbox properties to create a responsive and well-structured design.',
        ],
        images: [
          {
            src: '/documentation/lay.png',
            alt: 'Right panel showing layout styling options',
            caption: 'Adjusting layout properties for better design'
          }
        ]
      },
      {
        title: 'Size and dimensions',
        paragraphs: [
          'Customize the size and dimensions of your elements using the styling options in the right panel. You can set width and height properties, adjust spacing, and create a visually balanced design.',
        ],
        images: [
          {
            src: '/documentation/size.png',
            alt: 'Right panel showing size and dimension options',
            caption: 'Customizing size and dimensions for your elements'
          }
        ]
      },
      {
        title: 'Spacing and alignment',
        paragraphs: [
          'Fine-tune the spacing and alignment of your elements to create a polished design. Use the margin and padding controls to adjust the space around your elements, and use alignment options to ensure everything is properly positioned on the page.',
        ],
        images: [
          {
            src: '/documentation/space.png',
            alt: 'Right panel showing spacing and alignment options',
            caption: 'Adjusting spacing and alignment for a polished design'
          }
        ]
      },
      {
        title: 'Typography and colors',
        paragraphs: [
          'Customize the typography and colors of your website to create a unique and visually appealing design. Use the font controls to choose from a variety of fonts, adjust sizes, and set text properties. Use the color controls to select colors for text, backgrounds, borders, and more to create a cohesive color scheme for your website.',
        ],
        images: [
          {
            src: '/documentation/typography.png',
            alt: 'Right panel showing typography and color options',
            caption: 'Customizing typography and colors for a unique design'
          }
        ]
      },
      {
        title: 'Background',
        paragraphs: [
          'Set background colors or images for your sections and elements to create visual interest and depth in your design. Use the background controls in the right panel to choose colors, upload images, and adjust background properties for a stunning website.',
        ],
        images: [
          {
            src: '/documentation/background.png',
            alt: 'Right panel showing background styling options',
            caption: 'Setting background colors and images for visual interest'
          }
        ]
      },
      {
        title: 'Borders and shadows',
        paragraphs: [
          'Add borders and shadows to your elements to create depth and visual hierarchy. Use the border controls to set border styles, widths, and colors. Use the shadow controls to add drop shadows and inner shadows for a more dynamic look.',
        ],
        images: [
          {
            src: '/documentation/border.png',
            alt: 'Right panel showing borders and shadows options',
            caption: 'Adding borders and shadows for visual interest'
          }
        ]
      },
      {
        title: 'Effects and interactions',
        paragraphs: [
          'Enhance your design with dynamic effects and interactions. Use the effects controls to add animations, transitions, and other interactive elements to your components.',
        ],
        images: [
          {
            src: '/documentation/effect.png',
            alt: 'Right panel showing effects and interactions options',
            caption: 'Adding dynamic effects and interactions for a engaging user experience'
          }
        ]
      }
    ],
  },
  {
    id: 'custom-css',
    title: 'Custom CSS',
    icon: <ShieldCheck size={18} />,
    intro: 'Add custom CSS file to your project to apply global styles across your website. This allows you to further customize the appearance of your site beyond the built-in styling options in the builder.',
    sections: [
      {
        title: 'Adding a custom CSS',
        paragraphs: [
          'Custom CSS allows you to apply global styles across your website. This gives you more control over the appearance of your site beyond the built-in styling options in the builder.',
        ],
        images: [
          {
            src: '/documentation/css.png',
            alt: 'Custom CSS file upload interface',
            caption: 'Adding a custom CSS file to your project for global styling'
          }
        ]
      },
    ],
  },
  {
    id: 'publishing',
    title: 'Publishing',
    icon: <Sparkles size={18} />,
    intro: 'Learn how to publish your website after designing it in the builder. This section covers the publishing workflow, including how to preview your site before going live and how to manage published content.',
    sections: [
      {
        title: 'Publish to Vercel',
        paragraphs: [
          'Once you have designed your website, you can publish it directly to Vercel with a single click. This allows you to get your site online quickly and easily, without needing to worry about hosting or deployment.',
        ],
      },
      {
        title: 'Step 1: Click the Publish Button & Select Publish to Vercel',
        paragraphs: [
          'In the builder interface, click the publish button located in the top right corner. Then select the "Publish to Vercel" option from the dropdown menu to start the publishing process.',
        ],
        images: [
          {
            src: '/documentation/publish.png',
            alt: 'Publish button and Vercel option in the builder interface',
            caption: 'Publishing your website to Vercel with a single click'
          }
        ]
      },
      {
        title: 'Step 2: Prompted to Enter Vercel Personal Access Token',
        paragraphs: [
          'To publish your site to Vercel, you will need to provide a Personal Access Token from your Vercel account. This token allows LUNIO Builder to deploy your site on your behalf. You can generate a Personal Access Token in your Vercel account settings under the "Tokens" section.',
        ],
        images: [
          {
            src: '/documentation/token.png',
            alt: 'Vercel Personal Access Token interface',
            caption: <a href="https://vercel.com/kb/guide/how-do-i-use-a-vercel-api-access-token" target="_blank" className="text-primary underline">How to Get the Vercel Personal Access Token</a>
          }
        ]
      },
      {
        title: 'Step 3: Enter Team Name (if applicable)',
        paragraphs: [
          'If you are part of a Vercel team, you will also need to enter your team name during the publishing process. This ensures that your site is deployed to the correct team account on Vercel.',
        ],
      },
      {
        title: 'Step 4: Enter Project Name and Select Root Directory',
        paragraphs: [
          'After providing the necessary information, your site will be published to Vercel. You can view your live site immediately after publishing, and any future changes you make in the builder can be republished with a single click.',
        ],
      },
      {
        title: 'Finally: Website will Start Publishing',
        paragraphs: [
          'Once the publishing process is complete, your website will be live on Vercel. You can share the live URL with others or manage your published content at any time.',
        ],
      }
    ],
  },
];

export default function DocumentationPage() {
  const [selectedTopicId, setSelectedTopicId] = useState(TOPICS[0].id);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedTopic = useMemo(
    () => TOPICS.find(topic => topic.id === selectedTopicId) || TOPICS[0],
    [selectedTopicId]
  );

  const filteredTopics = useMemo(() => {
    if (!searchQuery) return TOPICS;
    return TOPICS.filter(topic =>
      topic.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      topic.intro.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50 text-black scroll-smooth">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/60">
        <div className="container flex h-16 items-center px-4">
          <div className="flex items-center space-x-4">
            <div className='flex'>
              <Link href={"/"}>
                <div className="flex items-center text-black gap-2 cursor-pointer font-bold uppercase text-lg">
                  <div className='flex flex-row text-2xl align-middle items-center'>
                    <h1>LUNI</h1>
                    <Rocket width={20} className="text-bold text-[#b8f36b]" />
                  </div>
                  <h1 className='flex flex-row text-2xl align-middle items-center'>BUILDER</h1>
                </div>
              </Link>
            </div>
          </div>

          <div className="ml-auto flex items-center space-x-4">
            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search documentation..."
                className="h-9 w-64 rounded-md border border-input bg-background pl-9 pr-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Mobile menu button */}
            <button
              className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground md:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
        {/* Sidebar */}
        <aside className={`fixed top-16 z-30 -ml-2 h-[calc(100vh-4rem)] w-full shrink-0 overflow-y-auto border-r bg-white md:sticky md:block ${sidebarOpen ? 'block' : 'hidden md:block'
          }`}>
          <div className="py-6">
            <div className="mb-4 md:hidden">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  placeholder="Search..."
                  className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <nav>
              {filteredTopics.map(topic => {
                const active = topic.id === selectedTopicId;
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => {
                      setSelectedTopicId(topic.id);
                      setSidebarOpen(false);
                    }}
                    className={`w-full py-4 px-4 text-left transition-all duration-200 hover:bg-accent ${active
                        ? 'bg-primary/10 text-primary'
                        : 'border-transparent text-muted-foreground hover:text-black/80'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`mt-0.5 ${active ? 'text-primary' : 'text-black/50'}`}>
                        {topic.icon}
                      </span>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium leading-none">{topic.title}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="relative py-6 lg:gap-10 lg:py-8 xl:grid xl:grid-cols-[1fr_300px]">
          <div className="mx-auto w-full min-w-0 max-w-3xl max-md:px-5">
            {/* Breadcrumbs */}
            <div className="mb-6 flex items-center space-x-1 text-sm text-black/50">
              <span>Documentation</span>
              <span>/</span>
              <span className="font-medium text-black">{selectedTopic.title}</span>
            </div>

            {/* Content */}
            <div className="space-y-8">
              <div>
                <h1 className="scroll-m-20 text-4xl font-bold tracking-tight">{selectedTopic.title}</h1>
                <p className="mt-2 text-lg text-muted-foreground">{selectedTopic.intro}</p>
              </div>

              {selectedTopic.sections.map((section, index) => (
                <section
                  key={index}
                  id={section.title.toLowerCase().replace(/\s+/g, '-')}
                  className="scroll-m-20 space-y-4"
                >
                  <h2 className="text-2xl font-semibold tracking-tight">{section.title}</h2>
                  <div className="space-y-4 text-muted-foreground">
                    {section.paragraphs.map((paragraph, paragraphIndex) => (
                      <p key={paragraphIndex} className="leading-7">{paragraph}</p>
                    ))}
                    {section.list && (
                      <ul className="space-y-2">
                        {section.list.map((item, itemIndex) => (
                          <li key={itemIndex} className="flex items-start gap-2">
                            <CircleDot className="mt-1 h-4 w-4 shrink-0 text-primary" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {section.images && section.images.length > 0 && (
                      <div className="space-y-4">
                        {section.images.map((image, imageIndex) => (
                          <figure key={imageIndex} className="space-y-2">
                            <img
                              src={image.src}
                              alt={image.alt}
                              className="rounded-lg border shadow-sm"
                              onError={(e) => {
                                // Hide broken images
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            {image.caption && (
                              <figcaption className="text-sm text-muted-foreground text-center">
                                {image.caption}
                              </figcaption>
                            )}
                          </figure>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              ))}
            </div>
          </div>
          <div className="hidden text-sm xl:block">
            <div className="sticky top-16 -mt-10 pt-4">
              <div className="space-y-2">
                <p className="font-medium">On This Page</p>
                <ul className="space-y-1">
                  {selectedTopic.sections.map((section, index) => (
                    <li key={index}>
                      <a
                        href={`#${section.title.toLowerCase().replace(/\s+/g, '-')}`}
                        className="block py-1 text-muted-foreground hover:text-foreground"
                      >
                        {section.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
